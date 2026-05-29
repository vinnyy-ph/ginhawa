# Shared Gemini Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract resilient Gemini calls (model fallback + rate-limit retry) into one shared `GeminiService` used by both recommendations and consultation, so `consultation.summarize` gains the resilience it lacked and the model list lives in one place.

**Architecture:** New `src/ai` module providing `GeminiService` with two methods — `generateJson<T>` (non-streaming) and `generateJsonStream<T>` (streaming). Both run the same model-fallback + rate-limit-retry loop. `recommendations.service` and `consultation.service` inject it; their AI logic is removed.

**Tech Stack:** NestJS, `@google/generative-ai`, Jest. Backend dir: `backend/`. All commands run from `backend/`.

---

### Task 1: Create `GeminiService` and `AiModule`

**Files:**
- Create: `backend/src/ai/gemini.service.ts`
- Create: `backend/src/ai/ai.module.ts`
- Test: `backend/src/ai/gemini.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/ai/gemini.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { GeminiService } from './gemini.service';

const mockGenerateContent = jest.fn();
const mockGenerateContentStream = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
    }),
  })),
  SchemaType: { STRING: 'STRING', OBJECT: 'OBJECT' },
}));

async function drain<T>(gen: AsyncGenerator<string, T>) {
  let out = '';
  let r = await gen.next();
  while (!r.done) {
    out += r.value;
    r = await gen.next();
  }
  return { out, value: r.value as T };
}

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeminiService],
    }).compile();
    service = module.get<GeminiService>(GeminiService);
    jest.clearAllMocks();
  });

  describe('generateJson', () => {
    it('returns parsed JSON on first-model success', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"a":1}' },
      });
      const result = await service.generateJson<{ a: number }>('p');
      expect(result).toEqual({ a: 1 });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('strips markdown fences before parsing', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '```json\n{"a":1}\n```' },
      });
      const result = await service.generateJson<{ a: number }>('p');
      expect(result).toEqual({ a: 1 });
    });

    it('throws on unparseable response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'not json' },
      });
      await expect(service.generateJson('p')).rejects.toThrow(
        'AI returned an unparseable response. Please try again.',
      );
    });

    it('switches to the next model after a rate-limited model fails twice', async () => {
      mockGenerateContent
        .mockRejectedValueOnce({ status: 429, retryDelay: 1 })
        .mockRejectedValueOnce({ status: 429, retryDelay: 1 })
        .mockResolvedValueOnce({ response: { text: () => '{"ok":true}' } });
      const result = await service.generateJson<{ ok: boolean }>('p');
      expect(result).toEqual({ ok: true });
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('throws HttpException 429 when all models are rate limited', async () => {
      mockGenerateContent.mockRejectedValue({ status: 429, retryDelay: 1 });
      await expect(service.generateJson('p')).rejects.toBeInstanceOf(
        HttpException,
      );
    });

    it('rethrows a non-rate-limit error immediately', async () => {
      mockGenerateContent.mockRejectedValue(new Error('boom'));
      await expect(service.generateJson('p')).rejects.toThrow('boom');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateJsonStream', () => {
    it('yields chunks and returns parsed result', async () => {
      mockGenerateContentStream.mockResolvedValue({
        stream: [{ text: () => '{"a":1}' }],
      });
      const { out, value } = await drain(service.generateJsonStream<{ a: number }>('p'));
      expect(out).toBe('{"a":1}');
      expect(value).toEqual({ a: 1 });
    });

    it('rethrows a non-rate-limit error immediately', async () => {
      mockGenerateContentStream.mockRejectedValue(new Error('boom'));
      await expect(drain(service.generateJsonStream('p'))).rejects.toThrow('boom');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest gemini.service`
Expected: FAIL — `Cannot find module './gemini.service'`.

- [ ] **Step 3: Create `GeminiService`**

Create `backend/src/ai/gemini.service.ts`:

```ts
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
```

- [ ] **Step 4: Create `AiModule`**

Create `backend/src/ai/ai.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@Module({
  providers: [GeminiService],
  exports: [GeminiService],
})
export class AiModule {}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest gemini.service`
Expected: PASS — 8 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ai/
git commit -m "feat(ai): add shared GeminiService with model fallback + rate-limit retry"
```

---

### Task 2: Refactor `recommendations.service` to use `GeminiService`

**Files:**
- Modify: `backend/src/recommendations/recommendations.service.ts`
- Modify: `backend/src/recommendations/recommendations.module.ts`
- Modify: `backend/src/recommendations/recommendations.service.spec.ts`

- [ ] **Step 1: Wire `AiModule` into `RecommendationsModule`**

Replace the contents of `backend/src/recommendations/recommendations.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
```

- [ ] **Step 2: Refactor the service**

In `backend/src/recommendations/recommendations.service.ts`:

Replace the top imports block (lines 1-10) with:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { SchemaType } from '@google/generative-ai';
import { GeminiService } from '../ai/gemini.service';
```

Delete the `FALLBACK_MODELS` constant (the `const FALLBACK_MODELS = [...] as const;` block).

Replace the class fields + constructor (the `private readonly genAI`, `private readonly logger`, and `constructor`) with:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}
```

Delete the `isRateLimitError` and `getRetryDelay` private methods entirely.

Replace the entire `getAIRecommendationStream` method with:

```ts
  private getAIRecommendationStream(
    symptomInput: string,
    patientContext?: PatientContext,
  ): AsyncGenerator<string, { specialization: string; explanation: string }> {
    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        specialization: { type: SchemaType.STRING, enum: VALID_SPECIALIZATIONS },
        explanation: { type: SchemaType.STRING },
      },
      required: ['specialization', 'explanation'],
    };
    const prompt = this.buildPrompt(symptomInput, patientContext);
    return this.gemini.generateJsonStream<{
      specialization: string;
      explanation: string;
    }>(prompt, { schema });
  }
```

Leave `buildPrompt`, `VALID_SPECIALIZATIONS`, `createStream`, and `findAllForPatient` unchanged.

- [ ] **Step 3: Update the spec to provide `GeminiService`**

In `backend/src/recommendations/recommendations.service.spec.ts`:

Add the import after the existing imports:

```ts
import { GeminiService } from '../ai/gemini.service';
```

In the `Test.createTestingModule` providers array, add `GeminiService`:

```ts
      providers: [
        RecommendationsService,
        GeminiService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
```

No other test changes: `GeminiService` uses the already-mocked `@google/generative-ai`, so the existing `mockGenerateContentStream` assertions still drive it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest recommendations.service`
Expected: PASS — all existing recommendations tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/recommendations/
git commit -m "refactor(recommendations): use shared GeminiService for AI calls"
```

---

### Task 3: Refactor `consultation.service.summarize` to use `GeminiService`

**Files:**
- Modify: `backend/src/consultation/consultation.service.ts`
- Modify: `backend/src/consultation/consultation.module.ts`
- Test: `backend/src/consultation/consultation.service.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `backend/src/consultation/consultation.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationService } from './consultation.service';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
  SchemaType: { STRING: 'STRING', OBJECT: 'OBJECT' },
}));

describe('ConsultationService', () => {
  let service: ConsultationService;

  const mockPrismaService = {
    appointment: { findUnique: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationService,
        GeminiService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<ConsultationService>(ConsultationService);
    jest.clearAllMocks();
  });

  describe('summarize', () => {
    const appointment = {
      id: 'appt-1',
      liveNotes: 'patient has a cough',
      doctor: { userId: 'doc-1' },
      patient: {},
    };

    it('returns the parsed summary for the owning doctor', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(appointment);
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            '{"doctorSummary":"d","patientSummary":"p","prescriptions":"","followUp":"f"}',
        },
      });

      const result = await service.summarize('appt-1', 'doc-1');
      expect(result).toEqual({
        doctorSummary: 'd',
        patientSummary: 'p',
        prescriptions: '',
        followUp: 'f',
      });
    });

    it('throws when the AI response is unparseable', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(appointment);
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'garbage' },
      });

      await expect(service.summarize('appt-1', 'doc-1')).rejects.toThrow(
        'AI returned an unparseable response. Please try again.',
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify the baseline**

Run: `npx jest consultation.service`
Expected: PASS against the current code. This is a refactor-guard test (no consultation spec existed before), so it characterizes `summarize`'s existing behavior and must keep passing after the DI swap in Step 3. The genuinely new behavior (model fallback + rate-limit retry) is covered by `gemini.service.spec` in Task 1.

- [ ] **Step 3: Refactor the service**

In `backend/src/consultation/consultation.service.ts`:

Replace the top imports block (lines 1-7) with:

```ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
```

Replace the `genAI` field + constructor with:

```ts
@Injectable()
export class ConsultationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}
```

Replace the body of `summarize` from the `const model = ...` line through the end of the method (the `generateContent` call, the parse `try/catch`, and the `return`) with:

```ts
    const notes = appointment.liveNotes ?? '';
    const prompt = `You are a clinical assistant. Analyze these doctor's notes from a telemedicine consultation and return ONLY a valid JSON object (no markdown, no code blocks) with these exact keys:
{
  "doctorSummary": "clinical summary for the doctor with diagnosis and medical terminology",
  "patientSummary": "simple, empathetic summary for the patient in plain language",
  "prescriptions": "list of prescriptions if mentioned, or empty string",
  "followUp": "follow-up recommendations"
}
Notes: ${notes}`;

    return this.gemini.generateJson(prompt);
```

Leave `getOrCreateRoom` and `updateNotes` unchanged.

- [ ] **Step 4: Wire `AiModule` into `ConsultationModule`**

Replace the contents of `backend/src/consultation/consultation.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { ConsultationController } from './consultation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ConsultationController],
  providers: [ConsultationService],
})
export class ConsultationModule {}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest consultation.service`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/src/consultation/
git commit -m "refactor(consultation): summarize via shared GeminiService for fallback resilience"
```

---

### Task 4: Full verification

- [ ] **Step 1: Run the full backend test suite**

Run: `npx jest`
Expected: PASS — all suites green (previous count + new gemini and consultation suites).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No new errors. (Pre-existing errors in `appointments.service.spec.ts` for `findMany` on the prisma user mock are unrelated to this work.)

- [ ] **Step 3: Confirm no stray Gemini instantiation remains in callers**

Run: `grep -rn "new GoogleGenerativeAI" backend/src --include="*.ts" | grep -v spec`
Expected: only `backend/src/ai/gemini.service.ts`.
