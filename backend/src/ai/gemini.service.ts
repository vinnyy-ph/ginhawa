import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
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

  private isRateLimitError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const e = error as Record<string, unknown>;
    const status = e['status'];
    const msg = String(e['message'] ?? '');
    return (
      status === 429 || status === 503 || msg.includes('429') || msg.includes('503')
    );
  }

  private getRetryDelay(error: unknown): number {
    if (typeof error === 'object' && error !== null) {
      const delay = (error as Record<string, unknown>)['retryDelay'];
      if (typeof delay === 'number' && delay > 0) return delay;
    }
    return 1000;
  }

  private buildConfig(opts?: GenerateOpts) {
    return {
      responseMimeType: 'application/json',
      ...(opts?.schema ? { responseSchema: opts.schema as any } : {}),
    };
  }

  private rateLimited(): never {
    throw new HttpException(
      'Service is currently rate limited. Please try again in a moment.',
      HttpStatus.TOO_MANY_REQUESTS,
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
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig,
          });
          const result = await model.generateContent(prompt);
          const text = result.response.text().trim();
          if (mi > 0) this.logger.log(`Successfully using fallback model: ${modelName}`);
          return this.parseJson<T>(text);
        } catch (error) {
          if (!this.isRateLimitError(error)) throw error;
          const delay = this.getRetryDelay(error);
          if (attempt === 0) {
            this.logger.warn(`${modelName} rate limited, retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
          } else if (mi < FALLBACK_MODELS.length - 1) {
            this.logger.warn(
              `${modelName} failed after retry, switching to ${FALLBACK_MODELS[mi + 1]}`,
            );
          }
        }
      }
    }
    this.rateLimited();
  }

  async *generateJsonStream<T>(
    prompt: string,
    opts?: GenerateOpts,
  ): AsyncGenerator<string, T> {
    const generationConfig = this.buildConfig(opts);
    for (let mi = 0; mi < FALLBACK_MODELS.length; mi++) {
      const modelName = FALLBACK_MODELS[mi];
      for (let attempt = 0; attempt < 2; attempt++) {
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
          if (mi > 0) this.logger.log(`Successfully using fallback model: ${modelName}`);
          return JSON.parse(fullText) as T;
        } catch (error) {
          if (!this.isRateLimitError(error)) throw error;
          const delay = this.getRetryDelay(error);
          if (attempt === 0) {
            this.logger.warn(`${modelName} rate limited, retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
          } else if (mi < FALLBACK_MODELS.length - 1) {
            this.logger.warn(
              `${modelName} failed after retry, switching to ${FALLBACK_MODELS[mi + 1]}`,
            );
          }
        }
      }
    }
    this.rateLimited();
  }
}
