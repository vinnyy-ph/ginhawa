import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  private readonly genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(GeminiService.name);

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
  }

  // 429 (rate limited) and 503 (model overloaded) are transient: fail over to
  // the next model. Anything else (404 bad model, 400, auth) is fatal.
  private isRetryable(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const e = error as Record<string, unknown>;
    const status = e['status'];
    const msg = String(e['message'] ?? '');
    return (
      status === 429 || status === 503 || msg.includes('429') || msg.includes('503')
    );
  }

  private buildConfig(opts?: GenerateOpts) {
    return {
      responseMimeType: 'application/json',
      ...(opts?.schema ? { responseSchema: opts.schema as any } : {}),
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
        throw new Error('AI returned an unparseable response. Please try again.');
      }
    }
  }

  async generateJson<T>(prompt: string, opts?: GenerateOpts): Promise<T> {
    const generationConfig = this.buildConfig(opts);
    for (let mi = 0; mi < FALLBACK_MODELS.length; mi++) {
      const modelName = FALLBACK_MODELS[mi];
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig,
        });
        const result = await model.generateContent(prompt);
        if (mi > 0) this.logger.log(`Using fallback model: ${modelName}`);
        return this.parseJson<T>(result.response.text().trim());
      } catch (error) {
        if (!this.isRetryable(error)) throw error;
        if (mi < FALLBACK_MODELS.length - 1) {
          this.logger.warn(
            `${modelName} unavailable, switching to ${FALLBACK_MODELS[mi + 1]}`,
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
    const generationConfig = this.buildConfig(opts);
    for (let mi = 0; mi < FALLBACK_MODELS.length; mi++) {
      const modelName = FALLBACK_MODELS[mi];
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig,
        });
        const result = await model.generateContentStream(prompt);
        let fullText = '';
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;
          yield chunkText;
        }
        if (mi > 0) this.logger.log(`Using fallback model: ${modelName}`);
        return JSON.parse(fullText) as T;
      } catch (error) {
        if (!this.isRetryable(error)) throw error;
        if (mi < FALLBACK_MODELS.length - 1) {
          this.logger.warn(
            `${modelName} unavailable, switching to ${FALLBACK_MODELS[mi + 1]}`,
          );
        }
      }
    }
    this.exhausted();
  }
}
