# Streaming AI Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a real-time streaming AI symptom analysis using Gemini's Structured Outputs and Server-Sent Events to provide an instantaneous user experience and eliminate 500 errors.

**Architecture:** The backend will use `generateContentStream` with `responseSchema` to strictly enforce the JSON structure and stream chunks. The NestJS controller will forward this stream to the frontend via `@Res()`. The Next.js frontend will read the stream, parse the partial JSON, and type out the AI's explanation in real-time.

**Tech Stack:** NestJS, Next.js, @google/generative-ai, partial-json

---

### Task 1: Add partial-json to frontend

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install partial-json**

```bash
cd frontend
npm install partial-json
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add partial-json for streaming ai response parsing"
```

### Task 2: Update Backend Service (RecommendationsService)

**Files:**
- Modify: `backend/src/recommendations/recommendations.service.ts`
- Modify: `backend/src/recommendations/recommendations.service.spec.ts`

- [ ] **Step 1: Update the tests to reflect stream changes**

Update `backend/src/recommendations/recommendations.service.spec.ts` to mock `generateContentStream` instead of `generateContent`.

```typescript
// Add near top:
const mockGenerateContentStream = jest.fn();
// Update the mock implementation:
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContentStream: mockGenerateContentStream,
    }),
  })),
  SchemaType: { STRING: 'STRING', OBJECT: 'OBJECT' },
}));

// In the tests, update the mock returned value to return an async iterable:
// Replace `mockGenerateContent.mockResolvedValue` with `mockGenerateContentStream.mockResolvedValue({ stream: [{ text: () => '{"specialization":"Neurology","explanation":"Test explanation."}' }] })` etc.
// Note: Since testing stream implementations can be complex, ensure tests simulate the stream yielding strings.
```

- [ ] **Step 2: Update getAIRecommendation and create methods**

Modify `backend/src/recommendations/recommendations.service.ts` to use `generateContentStream`, `responseSchema`, and return the stream directly to the controller, while handling the DB save asynchronously.

```typescript
import { SchemaType } from '@google/generative-ai';

// Inside RecommendationsService class:

  async createStream(
    userId: string | null,
    createRecommendationDto: CreateRecommendationDto,
  ): Promise<{ stream: AsyncGenerator<string, void, unknown>, promise: Promise<any> }> {
    let patientId: string | null = null;
    let patientContext: { specializations: string[]; symptoms: string[] } | undefined;

    if (userId) {
      const patientProfile = await this.prisma.patientProfile.findUnique({ where: { userId } });
      patientId = patientProfile?.id ?? null;
      if (patientId) {
        const recentLogs = await this.prisma.recommendationLog.findMany({
          where: { patientId }, orderBy: { createdAt: 'desc' }, take: 5,
          select: { matchedSpecialization: true, symptomInput: true },
        });
        patientContext = { specializations: recentLogs.map((l) => l.matchedSpecialization), symptoms: recentLogs.map((l) => l.symptomInput) };
      }
    }

    const cachedLog = await this.prisma.recommendationLog.findFirst({
      where: { patientId, symptomInput: { equals: createRecommendationDto.symptomInput, mode: 'insensitive' }, aiExplanation: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    if (cachedLog && cachedLog.aiExplanation) {
      async function* generateCachedStream() {
        yield JSON.stringify({ specialization: cachedLog.matchedSpecialization, explanation: cachedLog.aiExplanation });
      }
      return { 
        stream: generateCachedStream(), 
        promise: this.prisma.recommendationLog.create({
          data: { patientId, symptomInput: createRecommendationDto.symptomInput, matchedSpecialization: cachedLog.matchedSpecialization, aiExplanation: cachedLog.aiExplanation },
        })
      };
    }

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            specialization: { type: SchemaType.STRING, enum: VALID_SPECIALIZATIONS },
            explanation: { type: SchemaType.STRING },
          },
          required: ['specialization', 'explanation'],
        },
      },
    });

    const prompt = this.buildPrompt(createRecommendationDto.symptomInput, patientContext);
    const result = await model.generateContentStream(prompt);
    
    let fullText = '';
    
    async function* processStream() {
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        yield chunkText;
      }
    }

    const stream = processStream();
    
    const promise = (async () => {
      // Consume the stream fully to get the final text if not already consumed
      // Wait, if the controller consumes it, we need to wait for it to finish.
      // A better way is to save to DB *after* the stream is fully consumed by the client, or parse it here.
    })();

    // To properly handle the stream and DB saving, we'll let the controller consume the stream or pipe it, 
    // but the easiest is to just return the raw result.stream and let the controller handle it.
```

*Refined Step 2 Implementation:*
```typescript
  async createStream(
    userId: string | null,
    createRecommendationDto: CreateRecommendationDto,
  ) {
    // ... [setup patientId and cachedLog as before] ...
    
    // Return an async iterable that yields string chunks, and saves to DB at the end
    const self = this;
    async function* generateStream() {
      if (cachedLog && cachedLog.aiExplanation) {
        yield JSON.stringify({ specialization: cachedLog.matchedSpecialization, explanation: cachedLog.aiExplanation });
        await self.prisma.recommendationLog.create({
          data: { patientId, symptomInput: createRecommendationDto.symptomInput, matchedSpecialization: cachedLog.matchedSpecialization, aiExplanation: cachedLog.aiExplanation },
        });
        return;
      }

      const model = self.genAI.getGenerativeModel({
        model: 'gemini-3.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              specialization: { type: SchemaType.STRING, enum: VALID_SPECIALIZATIONS },
              explanation: { type: SchemaType.STRING },
            },
            required: ['specialization', 'explanation'],
          },
        },
      });

      const prompt = self.buildPrompt(createRecommendationDto.symptomInput, patientContext);
      const result = await model.generateContentStream(prompt);
      
      let fullText = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        yield chunkText;
      }

      try {
        const parsed = JSON.parse(fullText);
        await self.prisma.recommendationLog.create({
          data: { patientId, symptomInput: createRecommendationDto.symptomInput, matchedSpecialization: parsed.specialization, aiExplanation: parsed.explanation },
        });
      } catch (e) {
        console.error("Failed to parse or save AI response", e);
      }
    }

    return generateStream();
  }
```

- [ ] **Step 3: Run backend tests to verify**

Run: `npm --prefix backend run test`
Expected: Passes (adjust test mocks to simulate async iterable if they fail).

- [ ] **Step 4: Commit**

```bash
git add backend/src/recommendations/recommendations.service.ts backend/src/recommendations/recommendations.service.spec.ts
git commit -m "feat(backend): implement streaming and structured outputs for recommendations"
```

### Task 3: Update Backend Controller

**Files:**
- Modify: `backend/src/recommendations/recommendations.controller.ts`

- [ ] **Step 1: Update controller method to use SSE/Res**

Update the `create` method to handle the async stream and pipe it to the response.

```typescript
import { Controller, Post, Body, Get, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';

// Inside RecommendationsController:

  @Post()
  @OptionalJwt()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req: { user?: { id?: string } },
    @Body() createRecommendationDto: CreateRecommendationDto,
    @Res() res: Response,
  ) {
    const userId = req.user?.id ?? null;
    const stream = await this.recommendationsService.createStream(userId, createRecommendationDto);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    try {
      for await (const chunk of stream) {
        res.write(chunk);
      }
    } catch (e) {
      console.error(e);
      res.write(JSON.stringify({ error: 'Stream failed' }));
    } finally {
      res.end();
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/recommendations/recommendations.controller.ts
git commit -m "feat(backend): stream recommendations response via chunked encoding"
```

### Task 4: Update Frontend Client and UI

**Files:**
- Modify: `frontend/src/app/dashboard/ai-recommendations/page.tsx`

- [ ] **Step 1: Update handleSubmit to process the stream**

Use native `fetch` instead of `apiRequest` so we can access the `body` stream, and use `partial-json` to parse the incoming chunks safely.

```typescript
// Add to imports:
import { parse } from 'partial-json';

// In DashboardAIRecommendationsPage, add state for streaming:
const [streamingSpecialization, setStreamingSpecialization] = useState<string | null>(null);
const [streamingExplanation, setStreamingExplanation] = useState<string>("");

// Replace handleSubmit logic:
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || symptoms.trim().length < 10) return;

    try {
      setIsSubmitting(true);
      setError(null);
      setResult(null);
      setStreamingSpecialization(null);
      setStreamingExplanation("");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symptomInput: symptoms }),
      });

      if (!response.ok) throw new Error("Failed to analyze symptoms.");
      if (!response.body) throw new Error("No response body.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkValue = decoder.decode(value, { stream: true });
          fullText += chunkValue;
          
          try {
            // parse partial json safely
            const parsed = parse(fullText);
            if (typeof parsed === 'object' && parsed !== null) {
              if (parsed.explanation) setStreamingExplanation(parsed.explanation);
              if (parsed.specialization) setStreamingSpecialization(parsed.specialization);
            }
          } catch (e) {
            // ignore parse errors for incomplete JSON
          }
        }
      }

      const finalParsed = parse(fullText) as RecommendationLog;
      // We mock the DB generated fields for the immediate UI, the real one is saved in the backend
      const completeLog = { ...finalParsed, id: 'temp-' + Date.now(), symptomInput: symptoms, createdAt: new Date().toISOString(), aiExplanation: finalParsed.explanation, matchedSpecialization: finalParsed.specialization };
      
      setResult(completeLog as RecommendationLog);
      setHistory((prev) => [completeLog as RecommendationLog, ...prev]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyze symptoms. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }
```

- [ ] **Step 2: Update UI rendering to show streaming state**

```tsx
// Find: {/* Result */}
// Update to show the streaming state immediately when isSubmitting is true or result is present
        {/* Result & Streaming State */}
        {(isSubmitting || result) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Show emergency UI if the stream determines it's an emergency early or final */}
            {(streamingSpecialization === 'EMERGENCY' || result?.matchedSpecialization === 'EMERGENCY') ? (
              // existing emergency block...
              <div className="bg-red-50 border-2 border-error rounded-xl p-8 text-center space-y-4">
                 {/* ... keep existing emergency UI ... */}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#48cab6]/10 to-[#31a795]/10 rounded-xl p-8 border border-primary/20 text-center transition-all duration-300">
                <p className="text-sm font-bold uppercase tracking-wider text-primary mb-2">
                  {isSubmitting ? "Analyzing Symptoms..." : "Recommendation"}
                </p>
                <p className="text-on-surface-variant mb-4">
                  Based on your symptoms, we recommend consulting a:
                </p>
                
                {/* Specialization Placeholder or Actual */}
                <h3 className={`font-serif text-3xl md:text-4xl font-bold mb-2 transition-all duration-500 ${isSubmitting && !streamingSpecialization ? 'text-primary/30 animate-pulse' : 'text-primary'}`}>
                  {streamingSpecialization || result?.matchedSpecialization || "Determining Specialist..."}
                </h3>
                
                {/* Typing Explanation */}
                <div className="text-on-surface-variant text-sm leading-relaxed italic mb-8 border-l-4 border-primary/30 pl-4 text-left min-h-[4rem]">
                  {streamingExplanation || result?.aiExplanation || (isSubmitting ? "Reading your symptoms and evaluating conditions..." : "")}
                  {isSubmitting && <span className="inline-block w-1.5 h-4 ml-1 bg-primary/70 animate-pulse align-middle"></span>}
                </div>

                {/* Final Actions (Only show when stream completes) */}
                {!isSubmitting && result && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in zoom-in duration-500 delay-150">
                    <Button asChild size="lg" className="shadow-soft">
                      <Link href={`/dashboard/find-doctors?specialization=${encodeURIComponent(result.matchedSpecialization)}`}>
                        Find {result.matchedSpecialization}s
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link href="/dashboard/find-doctors">Browse all doctors</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 3: Run frontend to verify**

Check visually in dev server that submitting instantly transitions to the streaming card.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/ai-recommendations/page.tsx
git commit -m "feat(frontend): stream AI recommendations in real-time"
```

---
