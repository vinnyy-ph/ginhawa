import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, Schema } from '@google/genai';

// gemini-3.1-flash-lite first: fast and currently healthy. The heavier
// gemini-3.5-flash has been returning 503 (overloaded), so it sits behind
// the lite model and only acts as a fallback.
const FALLBACK_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3-flash',
  'gemini-2.5-flash',
] as const;

type GenerateOpts = { schema?: object };

@Injectable()
export class GeminiService {
  private readonly ai: GoogleGenAI;
  private readonly logger = new Logger(GeminiService.name);

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
  }

  // 429 (rate limited) and 503 (model overloaded) are transient: fail over to
  // the next model. Anything else (404 bad model, 400, auth) is fatal.
  private isRetryable(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const e = error as Record<string, unknown>;
    const status = e['status'];
    const msg = typeof e['message'] === 'string' ? e['message'] : '';
    return (
      status === 429 ||
      status === 503 ||
      msg.includes('429') ||
      msg.includes('503')
    );
  }

  private buildConfig(opts?: GenerateOpts) {
    return {
      responseMimeType: 'application/json',
      // thinkingBudget 0 disables the model's internal reasoning pass, which is
      // the dominant latency for these flash models on short structured tasks.
      thinkingConfig: { thinkingBudget: 0 },
      temperature: 0.2,
      maxOutputTokens: 1024,
      ...(opts?.schema ? { responseSchema: opts.schema as Schema } : {}),
    };
  }

  private exhausted(): never {
    throw new HttpException(
      'AI service is busy. Please try again in a moment.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private parseJson<T>(text: string): T {
    try {
      return JSON.parse(text) as T;
    } catch {
      const clean = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      try {
        return JSON.parse(clean) as T;
      } catch {
        throw new Error(
          'AI returned an unparseable response. Please try again.',
        );
      }
    }
  }

  async generateJson<T>(prompt: string, opts?: GenerateOpts): Promise<T> {
    const config = this.buildConfig(opts);
    for (let mi = 0; mi < FALLBACK_MODELS.length; mi++) {
      const model = FALLBACK_MODELS[mi];
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: prompt,
          config,
        });
        if (mi > 0) this.logger.log(`Using fallback model: ${model}`);
        return this.parseJson<T>((response.text ?? '').trim());
      } catch (error) {
        if (!this.isRetryable(error)) throw error;
        if (mi < FALLBACK_MODELS.length - 1) {
          this.logger.warn(
            `${model} unavailable, switching to ${FALLBACK_MODELS[mi + 1]}`,
          );
        }
      }
    }
    this.exhausted();
  }

  async *generateJsonStream<T>(
    prompt: string,
    opts?: GenerateOpts,
  ): AsyncGenerator<string, T> {
    const config = this.buildConfig(opts);
    for (let mi = 0; mi < FALLBACK_MODELS.length; mi++) {
      const model = FALLBACK_MODELS[mi];
      try {
        const response = await this.ai.models.generateContentStream({
          model,
          contents: prompt,
          config,
        });
        let fullText = '';
        for await (const chunk of response) {
          const chunkText = chunk.text ?? '';
          if (chunkText) {
            fullText += chunkText;
            yield chunkText;
          }
        }
        if (mi > 0) this.logger.log(`Using fallback model: ${model}`);
        return JSON.parse(fullText) as T;
      } catch (error) {
        if (!this.isRetryable(error)) throw error;
        if (mi < FALLBACK_MODELS.length - 1) {
          this.logger.warn(
            `${model} unavailable, switching to ${FALLBACK_MODELS[mi + 1]}`,
          );
        }
      }
    }
    this.exhausted();
  }
}
