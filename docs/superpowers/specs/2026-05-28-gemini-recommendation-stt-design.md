# Gemini AI Recommendation + Speech-to-Text Design

**Date:** 2026-05-28  
**Branch:** fixes/recommendation-system

---

## Overview

Replace the keyword-dictionary recommendation engine with Gemini AI (`gemini-3.5-flash`). Add speech-to-text input via the browser Web Speech API. Both features apply to anonymous and logged-in patient flows; logged-in flow additionally injects patient history into the Gemini prompt for personalized results.

---

## Architecture

### Backend — `recommendations.service.ts`

Replace `determineSpecialization(symptoms: string): string` with `getAIRecommendation(symptomInput, patientContext?)` async method.

**Anonymous prompt:**
```
You are a medical triage assistant. A patient describes their symptoms: "{symptomInput}".

Return ONLY valid JSON in this exact format, no markdown:
{ "specialization": "<name>", "explanation": "<2-3 sentence reasoning>" }

Specialization must be one of: Cardiology, Dermatology, Orthopedics, Neurology,
Gastroenterology, Ophthalmology, Dentistry, Pediatrics, Gynecology, Psychiatry,
General Practice, EMERGENCY.

Use EMERGENCY only if symptoms indicate life-threatening conditions (chest pain,
stroke, difficulty breathing, heavy bleeding, unconscious, seizure, suicide, self-harm, poisoning).
```

**Logged-in prompt:** Same as above, with an additional context block injected before the symptoms:
```
Patient context (use this to personalize your recommendation):
- Recent specializations consulted: {last 5 matchedSpecialization values}
- Prior symptom history (brief): {last 5 symptomInput values, truncated to 100 chars each}
```

Patient context is fetched from `RecommendationLog` (last 5 logs for that patient). No consultation notes or profile fields are included in v1 — recommendation history is sufficient.

**Response parsing:**
1. Strip markdown code fences if present (```` ```json ... ``` ````)
2. `JSON.parse()` the result
3. Validate `specialization` is in the allowed list; throw `InternalServerErrorException` if not
4. Return `{ matchedSpecialization, aiExplanation }`

**Emergency keywords removed** — Gemini handles this via the prompt. The `emergencyKeywords` array and `keywordMap` dictionary are deleted entirely.

### Controller

No changes to `recommendations.controller.ts`. Endpoint signature, guards, and `@OptionalJwt()` remain the same.

---

## Data Model

**Migration:** Add `aiExplanation` to `RecommendationLog`.

```prisma
model RecommendationLog {
  id                    String          @id @default(cuid())
  patientId             String?         @map("patient_id")
  patient               PatientProfile? @relation(fields: [patientId], references: [id], onDelete: SetNull)
  symptomInput          String          @map("symptom_input")
  matchedSpecialization String          @map("matched_specialization")
  aiExplanation         String?         @map("ai_explanation")   // new
  createdAt             DateTime        @default(now()) @map("created_at")

  @@index([patientId])
  @@map("recommendation_logs")
}
```

Nullable so existing records are unaffected.

---

## Speech-to-Text

**Implementation:** Shared React hook `useSpeechRecognition` at `frontend/src/hooks/use-speech-recognition.ts`.

```ts
// Returns
{
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
}
```

- Uses `window.SpeechRecognition || window.webkitSpeechRecognition`
- `isSupported` is `false` if API unavailable → mic button hidden
- `continuous: false`, `interimResults: false` — fires once on silence
- On result: appends transcription to existing textarea value with a space separator if existing text is non-empty; replaces if empty (does not overwrite)
- On error: silently stops (no UI error — user can still type)

**UI — both pages:**
- Mic button (`MicrophoneIcon` from Radix) placed inline right of the textarea label
- Active state: red fill + `animate-pulse`
- Hidden (not disabled) when `isSupported === false`

---

## Frontend Result Display

### `/recommendations` (anonymous) — ResultsStep component

Add explanation block inside the result card, below the specialization heading:

```
┌─ Recommended Specialist ──────────────────────┐
│  [gradient header]                            │
│  Neurology                                    │
├───────────────────────────────────────────────┤
│  "Your symptoms suggest a migraine pattern.   │  ← aiExplanation
│   Persistent one-sided headaches with nausea  │
│   are typically evaluated by a neurologist."  │
│                                               │
│  [Find Neurologists]  [Browse all]            │
└───────────────────────────────────────────────┘
```

EMERGENCY result card: unchanged (no explanation shown).

### `/dashboard/ai-recommendations` (logged-in) — result div

Same explanation block added below specialization name in the result card.

**History cards:** Add explanation as a 1-line italic truncated paragraph below the existing symptom quote. No expand interaction.

---

## API Types

`RecommendationLog` type in `frontend/src/types/api.ts` gains:
```ts
aiExplanation?: string;
```

---

## Error Handling

- Gemini API failure → `InternalServerErrorException` with message "AI recommendation service unavailable"
- JSON parse failure → same exception
- Frontend: existing error display (`error` state) catches and shows the message

---

## What Is Not In Scope

- Firefox/Safari STT support (Web Speech API limitation)
- Streaming Gemini responses
- Multiple ranked specializations
- Consultation history or profile fields in the logged-in prompt (only recommendation logs used)
- STT on mobile (may work on Chrome Android; not tested)
