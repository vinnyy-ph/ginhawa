# Context-Aware Recommendations — Design

**Date:** 2026-05-30
**Status:** Approved, pre-implementation
**Branch:** `worktree-feature+context-aware-recommendations` (worktree off `origin/master`)

## Problem

Today `POST /recommendations` streams `{ specialization, explanation }` from Gemini and
the UI links to `/doctors?specialization=…`. The match is **specialization-only**: a
patient who says "I need a dentist in Manila with 5+ years of experience" gets a
specialization and a generic discovery link — location, experience, and review signals
in their request are thrown away, and they never see ranked doctors on the page.

Goal: one free-text box → AI extracts structured criteria (specialization + location +
experience + rating) → backend ranks **real** doctors with a deterministic weighted
score → the recommendations page shows the AI explanation **plus ranked doctor cards**,
each with a short "why it matches" reason. Closely-matching doctors still surface
(never empty unless the DB has no verified doctors). The existing symptom-triage value
(specialization inference + EMERGENCY detection) is preserved.

## Scope

In:
- New `POST /recommendations/match` endpoint returning a single JSON payload
  `{ explanation, criteria, emergency, doctors[] }`.
- AI criteria extraction (specialization, city, region, minYears, minRating, emergency).
- New `DoctorRankingService`: pure deterministic weighted scoring + match reasons.
- Frontend `/recommendations` page upgraded to render ranked doctor cards inline.

Out (YAGNI — do not build):
- Streaming the new match response (single JSON is enough; loader on the client).
- Touching the landing-page `InlineRecommendationWidget` (stays on current triage flow).
- Removing/replacing the old streaming `POST /recommendations` or `GET /recommendations`
  (history) endpoints — both stay; lowest blast radius.
- Consultation-fee, language, or availability as scoring signals (not requested).
- Any change to the notifications feature (separate branch).

## Decisions (from brainstorming)

1. **Match strategy:** scored ranking — score every candidate, sort best-first, never
   return empty (unless no verified doctors exist). Close matches surface with a reason.
2. **Extracted signals:** specialization, location (city/region), experience, rating.
3. **Result UX:** ranked doctor cards on `/recommendations`.
4. **Input intent:** one box; AI handles both symptom-triage and explicit-preference
   queries. Emergency detection preserved.
5. **Engine split:** AI extracts structured criteria JSON; backend does the DB query and
   deterministic weighted scoring (fast, cheap, testable, explainable). AI never ranks or
   names doctors.
6. **Delivery:** single JSON response.
7. **Old endpoint:** keep both — add `/match`, leave streaming `POST /` and history `GET /`
   untouched.

## Architecture

```
patient text ─POST /recommendations/match─▶ RecommendationsService.match()
                                              │
                                  1. Gemini (generateJson, non-stream) → criteria JSON
                                     { specialization, city, region,
                                       minYears, minRating, emergency, explanation }
                                              │
                                  2. emergency? → return { emergency:true, explanation,
                                       criteria, doctors:[] } (no ranking)
                                              │
                                  3. DoctorRankingService.rank(criteria, candidates)
                                       - candidates: isActive && isVerified doctors,
                                         with avgRating/reviewCount + availabilitySlots
                                       - weighted score each, sort desc
                                       - attach matchScore + matchReason per doctor
                                              │
                                  4. log to RecommendationLog (reuse existing shape:
                                       symptomInput, matchedSpecialization, aiExplanation)
                                              │
                          ◀── { explanation, criteria, emergency:false, doctors[] }
```

**Single-instance, single round-trip.** One AI call + one DB read + in-memory scoring.

## Components (small, isolated units)

- **`DoctorRankingService`** (new file `backend/src/recommendations/doctor-ranking.service.ts`)
  - Pure function core: `rank(criteria, candidates) → RankedDoctor[]`.
  - No AI, no HTTP, no Prisma. Input is plain criteria + candidate array; output is the
    sorted array with `matchScore` and `matchReason`. Fully unit-testable, deterministic.
  - What it does: scores each candidate, sorts, builds the human-readable reason.
  - Depends on: nothing (plain TS).

- **`RecommendationsService.match(userId, dto)`** (new method on the existing service)
  - Calls `extractCriteria()` (new private method → `gemini.generateJson` with a response
    schema), short-circuits on emergency, fetches candidates via `DoctorsService`, calls
    `DoctorRankingService.rank`, writes a `RecommendationLog`, returns the payload.
  - Depends on: `GeminiService`, `DoctorsService`, `DoctorRankingService`, `PrismaService`.

- **`DoctorsService`** (reused, already `exports`-ed from `DoctorsModule`)
  - Provides the verified+active candidate pool with ratings + slots. To avoid duplicating
    the rating roll-up, add a small `findRankingCandidates()` method that returns
    `isActive && isVerified` doctors with `attachRatings` applied and `availabilitySlots`
    + `specializations` included. `RecommendationsModule` imports `DoctorsModule`.

- **`POST /recommendations/match`** (new route on `RecommendationsController`)
  - `@OptionalJwt() @UseGuards(JwtAuthGuard)` — same auth posture as the existing
    `POST /`. Logs against the patient when authenticated, anonymous otherwise.

- **Frontend** — three existing files changed, plus a small match-reason chip:
  - `frontend/src/app/recommendations/page.tsx`: replace the streaming fetch with a single
    `apiRequest` to `/recommendations/match`; show a loader while waiting; pass the
    returned `doctors` + `explanation` + `emergency` into `ResultsStep`. History unchanged.
  - `frontend/src/components/recommendations/symptoms-step.tsx`: relabel copy for dual
    intent ("Describe your symptoms — or what you're looking for in a doctor"). Button +
    voice input unchanged.
  - `frontend/src/components/recommendations/results-step.tsx`: keep the explanation card
    and the emergency branch; after the explanation, render the ranked `<DoctorCard>` list
    (component already exists at `components/doctors/doctor-card.tsx`), each with a
    match-reason chip. Replace the single "Find Xs" link with the inline ranked list; keep
    a "Browse all specialists" fallback link.

## Scoring algorithm

Candidate pool: `isActive && isVerified` (mirrors existing `searchAll`).

Only criteria the AI actually extracted contribute. Weights renormalize over the criteria
that are present, so "dentist in Manila" does not penalize a doctor for unmentioned
experience or rating.

| Criterion | Raw weight | Per-doctor score |
|-----------|-----------|------------------|
| specialization | 0.50 | 1.0 if the doctor has the specialization, else 0 |
| location | 0.20 | city match 1.0 · region-only match 0.5 · else 0 |
| experience | 0.15 | `years ≥ minYears` → 1.0 · else `max(0, 1 − (minYears − years)/minYears)` · missing years → 0 |
| rating | 0.15 | `avgRating ≥ minRating` → 1.0 · else `avgRating / minRating` (0 reviews → 0) |

`final = Σ(weightᵢ · scoreᵢ) / Σ(present weightsᵢ)`.

Specialization match is checked against the doctor's `specializations[]` relation
(name, case-insensitive), falling back to the legacy `specialization` string.

Tiebreak order: higher `matchScore` → higher `avgRating` → higher `yearsOfExperience`.

`matchReason` is built from the parts that contributed, e.g.
`"Dentistry · Manila · 8 yrs (≥5 ✓) · 4.6★"`; a partial match reads
`"Dentistry · 3 yrs (you asked 5+)"`. Only mentioned criteria appear in the reason.

If the AI extracts a specialization that is not in the known list, it is treated as a
missing specialization criterion (weight drops out via renormalization) and ranking falls
back to the other signals rather than returning nothing.

## Criteria extraction (AI)

`extractCriteria(symptomInput, patientContext?)` calls `gemini.generateJson` (non-stream,
existing model-fallback + 503 handling) with a response schema:

```
{
  specialization: string | null,   // one of the known specializations, or null
  city: string | null,
  region: string | null,
  minYears: number | null,
  minRating: number | null,        // 1..5
  emergency: boolean,
  explanation: string              // 2–3 sentences
}
```

The prompt reuses the existing triage framing (specialization inference + EMERGENCY rules)
and adds: "Also extract any location, minimum years of experience, and minimum rating the
patient mentions; leave a field null if not mentioned." Existing patient-context
personalization (recent specializations, symptom history, medical history) is retained.

## Error handling

| Case | Behavior |
|------|----------|
| Gemini busy / unparseable | existing `GeminiService` throws 503 → frontend shows the same retry error as today |
| emergency detected | return `{ emergency:true, explanation, criteria, doctors:[] }`; UI shows the existing emergency screen, no doctors |
| zero verified doctors in DB | return `doctors:[]` + explanation; UI shows "no matching doctors yet" with a Browse-all link |
| AI returns specialization outside the known list | treated as missing specialization criterion; ranking uses remaining signals |
| log write fails | swallow (console.error) — never fail the response, matching existing behavior |

## Testing

- `DoctorRankingService` (pure unit, no mocks): exact match, partial experience, location
  city-vs-region, weight renormalization when only some criteria present, tiebreak order,
  empty candidate pool → empty result.
- `RecommendationsService.match` (mock Gemini + DoctorsService + Prisma): emergency
  short-circuit returns no doctors, criteria forwarded to ranking, log written on success,
  log-write failure swallowed.
- `RecommendationsController`: `/match` wiring + optional-jwt (authenticated vs anonymous).
- Frontend: `results-step` renders doctor cards + reason chips and preserves the emergency
  branch; `page` shows loader then results from a mocked `/match` response.

## Acceptance gate (before declaring done)

1. `cd backend && npx jest` — all suites pass (existing 116 + new).
2. `cd frontend && npx vitest run` — all suites pass (existing 105 + new).
3. `cd backend && npm run build` and `cd frontend && npx tsc --noEmit` — no type errors.
4. Lint clean on both apps.
5. Manual sanity: `POST /recommendations/match` with "dentist in Manila with 5+ years"
   returns ranked doctors with sensible reasons; an emergency phrase returns the emergency
   payload with no doctors.

## Post-completion cleanup

Per standing user preference, **delete both this spec file and the generated
implementation plan** once the work is complete and verified error-free
(`docs/superpowers/specs/2026-05-30-context-aware-recommendations-design.md` and
`docs/superpowers/plans/2026-05-30-context-aware-recommendations.md`).
