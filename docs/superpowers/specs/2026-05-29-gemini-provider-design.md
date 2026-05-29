# Shared Gemini Provider — Design

**Date:** 2026-05-29
**Status:** Approved, pending implementation

## Problem

Two services call the Gemini API independently:

- `recommendations.service.ts` — resilient: 4-model fallback list, rate-limit
  detection (429/503), retry-with-backoff, then switch model. Streaming.
- `consultation.service.ts` (`summarize`) — fragile: single model
  `gemini-3.5-flash`, no fallback, no rate-limit retry. Non-streaming.

The resilience logic (model list, `isRateLimitError`, `getRetryDelay`, retry
loop) lives only in recommendations. The model list churns often (gemini-3.5
current; 1.5/2.0 already deprecated). Duplicating it into consultation would
mean editing two lists on every deprecation, and the weaker copy would rot.

## Goal

Extract the resilient Gemini call into one shared provider so both call sites
share the model list and retry behavior. `consultation.summarize` gains the
fallback + rate-limit resilience it currently lacks.

Success criteria:

- One source of truth for `FALLBACK_MODELS` and rate-limit handling.
- recommendations behavior unchanged (streaming, schema, parsing).
- consultation.summarize now retries and falls back across models.
- All existing tests pass; new provider has unit coverage.

## Architecture

New module `src/ai/`:

- `gemini.service.ts` — `@Injectable() GeminiService`
- `ai.module.ts` — provides + exports `GeminiService`

`RecommendationsModule` and `ConsultationModule` import `AiModule`.

### GeminiService interface

```ts
@Injectable()
export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;   // new'd from GEMINI_API_KEY
  private readonly logger = new Logger(GeminiService.name);

  // shared private core (moved from recommendations)
  private isRateLimitError(error: unknown): boolean;
  private getRetryDelay(error: unknown): number;

  // non-streaming: model-fallback + rate-limit retry, JSON.parse with
  // markdown-strip fallback. Used by consultation.summarize.
  async generateJson<T>(prompt: string, opts?: { schema?: object }): Promise<T>;

  // streaming generator: same loop, yields text chunks, returns parsed result.
  // Moved verbatim from recommendations.getAIRecommendationStream.
  async *generateJsonStream<T>(
    prompt: string,
    opts?: { schema?: object },
  ): AsyncGenerator<string, T>;
}
```

`opts.schema` sets `responseSchema`. Both methods always set
`responseMimeType: 'application/json'`.

### Retry/fallback loop (shared by both methods)

For each model in `FALLBACK_MODELS`:
  attempt up to 2 times:
    - call the model (stream vs non-stream)
    - on success: log if a fallback model was used; return result
    - on rate-limit error (429/503): wait `getRetryDelay` on first attempt,
      else switch to next model
    - on any other error: throw immediately

After all models exhausted:
`throw new HttpException('Service is currently rate limited. Please try again in a moment.', HttpStatus.TOO_MANY_REQUESTS)`

### JSON parsing

- `generateJsonStream`: `JSON.parse(fullText)` (responseMimeType guarantees
  clean JSON — current recommendations behavior).
- `generateJson`: `JSON.parse(text)`, on failure strip ```` ```json ```` fences
  and retry; on second failure throw
  `'AI returned an unparseable response. Please try again.'` (current
  consultation behavior).

## Caller changes

### recommendations.service.ts

- Delete `FALLBACK_MODELS`, `isRateLimitError`, `getRetryDelay`, and the loop
  in `getAIRecommendationStream`.
- Inject `GeminiService`.
- `buildPrompt` unchanged.
- `createStream` generator does
  `const parsed = yield* this.gemini.generateJsonStream(prompt, { schema })`
  where `schema` is the existing specialization/explanation schema.
- `VALID_SPECIALIZATIONS` stays in recommendations (domain-specific).

### consultation.service.ts

- Remove the `genAI` field and its constructor init (only `summarize` used it;
  `getOrCreateRoom` uses the Daily.co REST fetch, untouched).
- Inject `GeminiService`.
- `summarize` builds the existing prompt and calls
  `this.gemini.generateJson<SummaryShape>(prompt)`. The inline parse/markdown
  logic is removed (now in the provider).

## Testing

- New `src/ai/gemini.service.spec.ts`:
  - 429 on first model → succeeds on second model
  - all models 429 → throws `HttpException` 429
  - non-rate-limit error → rethrown immediately
  - `generateJson` strips markdown fences and parses
  - `generateJson` unparseable after strip → throws parse error
- Update `recommendations.service.spec.ts` and `consultation.service.spec.ts`
  to mock `GeminiService` instead of `@google/generative-ai`.

## Out of scope

- Streaming for `summarize` (stays non-streaming — confirmed).
- Changing prompts or model names.
- Frontend changes.
