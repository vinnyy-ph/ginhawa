# Context-Aware Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the specialization-only recommender into a context-aware one: a patient types free text ("dentist in Manila with 5+ years"), the AI extracts structured criteria, and the backend returns real doctors ranked by a deterministic weighted score with a per-doctor "why it matches" reason, rendered as cards on `/recommendations`.

**Architecture:** A new `POST /recommendations/match` endpoint. `RecommendationsService.match()` calls Gemini once (non-stream, existing model-fallback) to extract `{ specialization, city, region, minYears, minRating, emergency, explanation }`, short-circuits on emergency, pulls the verified+active doctor pool from `DoctorsService`, and ranks it with a pure `DoctorRankingService`. Single JSON response. The old streaming `POST /recommendations` and history `GET /recommendations` are untouched, as is the landing-page inline widget.

**Tech Stack:** NestJS, RxJS-free, Prisma, `@google/genai`, Jest; Next.js, React, vitest, Testing Library.

---

## File Structure

**Backend**
- Create: `backend/src/recommendations/doctor-ranking.service.ts` — pure scoring + reasons. No AI/HTTP/Prisma.
- Create: `backend/src/recommendations/doctor-ranking.service.spec.ts` — unit tests for scoring.
- Create: `backend/src/recommendations/dto/match-result.dto.ts` — `MatchedDoctor`, `MatchResult` response types.
- Modify: `backend/src/doctors/doctors.service.ts` — add `findRankingCandidates()`.
- Modify: `backend/src/doctors/doctors.service.spec.ts` — cover `findRankingCandidates`.
- Modify: `backend/src/recommendations/recommendations.service.ts` — add `match()` + `extractCriteria()` + helpers.
- Modify: `backend/src/recommendations/recommendations.service.spec.ts` — provide new deps, cover `match`.
- Modify: `backend/src/recommendations/recommendations.controller.ts` — add `POST /match`.
- Create: `backend/src/recommendations/recommendations.controller.spec.ts` — cover `/match` wiring.
- Modify: `backend/src/recommendations/recommendations.module.ts` — import `DoctorsModule`, provide ranking service.

**Frontend**
- Modify: `frontend/src/types/api.ts` — add `MatchedDoctor`, `MatchResult`.
- Modify: `frontend/src/components/recommendations/results-step.tsx` — render ranked doctor cards + reason chips.
- Create: `frontend/src/components/recommendations/results-step.test.tsx` — card rendering + emergency branch.
- Modify: `frontend/src/components/recommendations/symptoms-step.tsx` — dual-intent copy.
- Modify: `frontend/src/app/recommendations/page.tsx` — single `/match` fetch + loader.
- Modify: `frontend/src/app/recommendations/page.test.tsx` — mock `/match`, assert cards.

---

## Task 1: Backend — DoctorRankingService (pure scoring)

**Files:**
- Create: `backend/src/recommendations/doctor-ranking.service.ts`
- Test: `backend/src/recommendations/doctor-ranking.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/recommendations/doctor-ranking.service.spec.ts`:

```ts
import { DoctorRankingService, MatchCriteria } from './doctor-ranking.service';

type TestDoctor = {
  id: string;
  specialization: string;
  city: string | null;
  region: string | null;
  yearsOfExperience: number | null;
  avgRating: number;
  reviewCount: number;
  specializations?: { specialization: { name: string } }[];
};

const base: Omit<MatchCriteria, never> = {
  specialization: null,
  city: null,
  region: null,
  minYears: null,
  minRating: null,
};

function doctor(over: Partial<TestDoctor>): TestDoctor {
  return {
    id: 'd',
    specialization: 'Dentistry',
    city: 'Manila',
    region: 'NCR',
    yearsOfExperience: 8,
    avgRating: 4.6,
    reviewCount: 12,
    ...over,
  };
}

describe('DoctorRankingService', () => {
  const service = new DoctorRankingService();

  it('ranks an exact match above a partial match', () => {
    const exact = doctor({ id: 'exact' });
    const wrongCity = doctor({ id: 'wrong', city: 'Cebu', region: 'Central Visayas' });
    const ranked = service.rank(
      { ...base, specialization: 'Dentistry', city: 'Manila' },
      [wrongCity, exact],
    );
    expect(ranked[0].id).toBe('exact');
    expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
  });

  it('scores experience below the threshold gracefully (not zero)', () => {
    const ranked = service.rank({ ...base, minYears: 10 }, [
      doctor({ id: 'd', yearsOfExperience: 5 }),
    ]);
    expect(ranked[0].matchScore).toBeGreaterThan(0);
    expect(ranked[0].matchScore).toBeLessThan(1);
  });

  it('renormalizes weights over present criteria only', () => {
    // Only specialization is asked; an exact-spec doctor scores 1.0 even with
    // no experience/rating data, because absent criteria do not penalize.
    const ranked = service.rank({ ...base, specialization: 'Dentistry' }, [
      doctor({ id: 'd', yearsOfExperience: null, avgRating: 0, reviewCount: 0 }),
    ]);
    expect(ranked[0].matchScore).toBe(1);
  });

  it('gives region-only match half the location credit of a city match', () => {
    const cityHit = service.rank({ ...base, city: 'Manila', region: 'NCR' }, [
      doctor({ id: 'c' }),
    ])[0].matchScore;
    const regionHit = service.rank({ ...base, city: 'Manila', region: 'NCR' }, [
      doctor({ id: 'r', city: 'Quezon City' }),
    ])[0].matchScore;
    expect(cityHit).toBeGreaterThan(regionHit);
    expect(regionHit).toBeGreaterThan(0);
  });

  it('breaks score ties by rating then experience', () => {
    const a = doctor({ id: 'a', specialization: 'Cardiology', avgRating: 4.9 });
    const b = doctor({ id: 'b', specialization: 'Cardiology', avgRating: 4.1 });
    const ranked = service.rank({ ...base, specialization: 'Cardiology' }, [b, a]);
    expect(ranked[0].id).toBe('a');
  });

  it('matches specialization via the specializations relation, case-insensitively', () => {
    const ranked = service.rank({ ...base, specialization: 'cardiology' }, [
      doctor({
        id: 'd',
        specialization: 'General Practice',
        specializations: [{ specialization: { name: 'Cardiology' } }],
      }),
    ]);
    expect(ranked[0].matchScore).toBe(1);
  });

  it('builds a human-readable match reason from present criteria', () => {
    const ranked = service.rank(
      { ...base, specialization: 'Dentistry', city: 'Manila', minYears: 5 },
      [doctor({ id: 'd', yearsOfExperience: 8 })],
    );
    expect(ranked[0].matchReason).toContain('Dentistry');
    expect(ranked[0].matchReason).toContain('Manila');
    expect(ranked[0].matchReason).toContain('8 yrs');
  });

  it('returns an empty array for an empty candidate pool', () => {
    expect(service.rank({ ...base, specialization: 'Dentistry' }, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/recommendations/doctor-ranking.service.spec.ts`
Expected: FAIL — cannot find module `./doctor-ranking.service`.

- [ ] **Step 3: Implement the ranking service**

Create `backend/src/recommendations/doctor-ranking.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

export interface MatchCriteria {
  specialization: string | null;
  city: string | null;
  region: string | null;
  minYears: number | null;
  minRating: number | null;
}

/** Minimal shape the scorer needs; real callers pass full doctor profiles. */
export interface ScorableDoctor {
  specialization: string;
  city: string | null;
  region: string | null;
  yearsOfExperience: number | null;
  avgRating: number;
  reviewCount: number;
  specializations?: { specialization: { name: string } }[];
}

export type RankedDoctor<T> = T & { matchScore: number; matchReason: string };

const WEIGHTS = {
  specialization: 0.5,
  location: 0.2,
  experience: 0.15,
  rating: 0.15,
} as const;

@Injectable()
export class DoctorRankingService {
  rank<T extends ScorableDoctor>(
    criteria: MatchCriteria,
    candidates: T[],
  ): RankedDoctor<T>[] {
    return candidates
      .map((d) => {
        const scores = {
          specialization: this.scoreSpecialization(criteria, d),
          location: this.scoreLocation(criteria, d),
          experience: this.scoreExperience(criteria, d),
          rating: this.scoreRating(criteria, d),
        };
        return {
          ...d,
          matchScore: this.combine(scores),
          matchReason: this.buildReason(criteria, d, scores),
        };
      })
      .sort(
        (a, b) =>
          b.matchScore - a.matchScore ||
          b.avgRating - a.avgRating ||
          (b.yearsOfExperience ?? 0) - (a.yearsOfExperience ?? 0),
      );
  }

  private combine(scores: Record<keyof typeof WEIGHTS, number | null>): number {
    let weighted = 0;
    let totalWeight = 0;
    for (const key of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
      const s = scores[key];
      if (s === null) continue;
      weighted += WEIGHTS[key] * s;
      totalWeight += WEIGHTS[key];
    }
    return totalWeight === 0 ? 0 : weighted / totalWeight;
  }

  private scoreSpecialization(
    c: MatchCriteria,
    d: ScorableDoctor,
  ): number | null {
    if (!c.specialization) return null;
    const target = c.specialization.toLowerCase();
    const names = [
      d.specialization,
      ...(d.specializations?.map((s) => s.specialization.name) ?? []),
    ].map((n) => n.toLowerCase());
    return names.includes(target) ? 1 : 0;
  }

  private scoreLocation(c: MatchCriteria, d: ScorableDoctor): number | null {
    if (!c.city && !c.region) return null;
    if (c.city && d.city && d.city.toLowerCase() === c.city.toLowerCase()) {
      return 1;
    }
    if (
      c.region &&
      d.region &&
      d.region.toLowerCase() === c.region.toLowerCase()
    ) {
      return 0.5;
    }
    return 0;
  }

  private scoreExperience(c: MatchCriteria, d: ScorableDoctor): number | null {
    if (c.minYears == null) return null;
    if (c.minYears <= 0) return 1;
    const years = d.yearsOfExperience;
    if (years == null) return 0;
    if (years >= c.minYears) return 1;
    return Math.max(0, 1 - (c.minYears - years) / c.minYears);
  }

  private scoreRating(c: MatchCriteria, d: ScorableDoctor): number | null {
    if (c.minRating == null) return null;
    if (c.minRating <= 0) return 1;
    if (d.reviewCount === 0) return 0;
    if (d.avgRating >= c.minRating) return 1;
    return Math.min(1, d.avgRating / c.minRating);
  }

  private buildReason(
    c: MatchCriteria,
    d: ScorableDoctor,
    scores: Record<keyof typeof WEIGHTS, number | null>,
  ): string {
    const parts: string[] = [];
    if (c.specialization) {
      parts.push(
        scores.specialization === 1
          ? c.specialization
          : `${c.specialization} (closest)`,
      );
    }
    if (scores.location === 1 && d.city) {
      parts.push(d.city);
    } else if (scores.location === 0.5 && d.region) {
      parts.push(`${d.region} region`);
    }
    if (c.minYears != null && d.yearsOfExperience != null) {
      parts.push(
        d.yearsOfExperience >= c.minYears
          ? `${d.yearsOfExperience} yrs (≥${c.minYears} ✓)`
          : `${d.yearsOfExperience} yrs (you asked ${c.minYears}+)`,
      );
    }
    if (c.minRating != null && d.reviewCount > 0) {
      parts.push(`${d.avgRating.toFixed(1)}★`);
    }
    return parts.join(' · ');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/recommendations/doctor-ranking.service.spec.ts`
Expected: PASS (all 8 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/recommendations/doctor-ranking.service.ts backend/src/recommendations/doctor-ranking.service.spec.ts
git commit -m "feat(recommendations): add deterministic DoctorRankingService"
```

---

## Task 2: Backend — DoctorsService.findRankingCandidates

**Files:**
- Modify: `backend/src/doctors/doctors.service.ts`
- Test: `backend/src/doctors/doctors.service.spec.ts`

- [ ] **Step 1: Add the failing test**

Open `backend/src/doctors/doctors.service.spec.ts`. Find the `mockPrismaService` object. Ensure it has a `review.groupBy` mock and a `doctorProfile.findMany` mock (the existing `searchAll` tests already need these — if `review: { groupBy: jest.fn() }` and `doctorProfile: { findMany: jest.fn() }` are present, reuse them; otherwise add them).

Append this `describe` block at the end of the top-level `describe('DoctorsService', ...)`, before its closing `});`:

```ts
  describe('findRankingCandidates', () => {
    it('returns only active+verified doctors with ratings attached', async () => {
      mockPrismaService.doctorProfile.findMany.mockResolvedValue([
        { id: 'doc-1', fullName: 'A' },
      ]);
      mockPrismaService.review.groupBy.mockResolvedValue([
        { doctorId: 'doc-1', _avg: { rating: 4.5 }, _count: { rating: 6 } },
      ]);

      const result = await service.findRankingCandidates();

      expect(mockPrismaService.doctorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, isVerified: true },
        }),
      );
      expect(result[0]).toMatchObject({
        id: 'doc-1',
        avgRating: 4.5,
        reviewCount: 6,
      });
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/doctors/doctors.service.spec.ts -t "findRankingCandidates"`
Expected: FAIL — `service.findRankingCandidates is not a function`.

- [ ] **Step 3: Implement the method**

In `backend/src/doctors/doctors.service.ts`, add this method right after `searchAll` (keep `attachRatings` private and reuse it):

```ts
  async findRankingCandidates() {
    const profiles = await this.prisma.doctorProfile.findMany({
      where: { isActive: true, isVerified: true },
      include: {
        availabilitySlots: true,
        specializations: { include: { specialization: true } },
      },
    });
    return this.attachRatings(profiles);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/doctors/doctors.service.spec.ts`
Expected: PASS (existing + new).

- [ ] **Step 5: Commit**

```bash
git add backend/src/doctors/doctors.service.ts backend/src/doctors/doctors.service.spec.ts
git commit -m "feat(doctors): add findRankingCandidates for recommendation ranking"
```

---

## Task 3: Backend — RecommendationsService.match + extractCriteria + module wiring

**Files:**
- Create: `backend/src/recommendations/dto/match-result.dto.ts`
- Modify: `backend/src/recommendations/recommendations.service.ts`
- Modify: `backend/src/recommendations/recommendations.service.spec.ts`
- Modify: `backend/src/recommendations/recommendations.module.ts`

- [ ] **Step 1: Create the response DTO**

Create `backend/src/recommendations/dto/match-result.dto.ts`:

```ts
import { PublicDoctorProfile } from '../../doctors/dto/public-doctor.dto';
import { MatchCriteria } from '../doctor-ranking.service';

export interface MatchedDoctor extends PublicDoctorProfile {
  avgRating: number;
  reviewCount: number;
  matchScore: number;
  matchReason: string;
}

export interface MatchResult {
  explanation: string;
  criteria: MatchCriteria;
  emergency: boolean;
  doctors: MatchedDoctor[];
}
```

- [ ] **Step 2: Add failing tests for `match`**

In `backend/src/recommendations/recommendations.service.spec.ts`:

First, update the imports and the TestingModule so the new dependencies resolve. Add these imports at the top:

```ts
import { DoctorsService } from '../doctors/doctors.service';
import { DoctorRankingService } from './doctor-ranking.service';
```

Add these mocks next to the existing `mockGeminiService`:

```ts
  const mockDoctorsService = {
    findRankingCandidates: jest.fn(),
  };

  const mockRankingService = {
    rank: jest.fn(),
  };
```

Add them to the `providers` array in `beforeEach`:

```ts
        { provide: DoctorsService, useValue: mockDoctorsService },
        { provide: DoctorRankingService, useValue: mockRankingService },
```

Then append this `describe` block inside the top-level `describe('RecommendationsService', ...)`:

```ts
  describe('match', () => {
    it('returns ranked doctors for a non-emergency query', async () => {
      mockGeminiService.generateJson.mockResolvedValue({
        specialization: 'Dentistry',
        city: 'Manila',
        region: null,
        minYears: 5,
        minRating: null,
        emergency: false,
        explanation: 'A dentist suits your request.',
      });
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.recommendationLog.create.mockResolvedValue({});
      const candidates = [{ id: 'doc-1', avgRating: 4, reviewCount: 2 }];
      mockDoctorsService.findRankingCandidates.mockResolvedValue(candidates);
      mockRankingService.rank.mockReturnValue([
        { id: 'doc-1', avgRating: 4, reviewCount: 2, matchScore: 1, matchReason: 'Dentistry' },
      ]);

      const result = await service.match(null, { symptomInput: 'dentist in Manila 5 years' });

      expect(result.emergency).toBe(false);
      expect(result.explanation).toBe('A dentist suits your request.');
      expect(result.criteria.specialization).toBe('Dentistry');
      expect(result.doctors).toHaveLength(1);
      expect(result.doctors[0].matchReason).toBe('Dentistry');
      expect(mockRankingService.rank).toHaveBeenCalledWith(
        expect.objectContaining({ specialization: 'Dentistry', city: 'Manila', minYears: 5 }),
        candidates,
      );
    });

    it('short-circuits on emergency and returns no doctors', async () => {
      mockGeminiService.generateJson.mockResolvedValue({
        specialization: 'EMERGENCY',
        city: null,
        region: null,
        minYears: null,
        minRating: null,
        emergency: true,
        explanation: 'Call 911.',
      });
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.recommendationLog.create.mockResolvedValue({});

      const result = await service.match(null, { symptomInput: 'crushing chest pain' });

      expect(result.emergency).toBe(true);
      expect(result.doctors).toEqual([]);
      expect(mockDoctorsService.findRankingCandidates).not.toHaveBeenCalled();
    });

    it('does not throw when the log write fails', async () => {
      mockGeminiService.generateJson.mockResolvedValue({
        specialization: null,
        city: null,
        region: null,
        minYears: null,
        minRating: null,
        emergency: false,
        explanation: 'ok',
      });
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.recommendationLog.create.mockRejectedValue(new Error('db down'));
      mockDoctorsService.findRankingCandidates.mockResolvedValue([]);
      mockRankingService.rank.mockReturnValue([]);

      await expect(
        service.match(null, { symptomInput: 'just a checkup please' }),
      ).resolves.toBeDefined();
    });
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && npx jest src/recommendations/recommendations.service.spec.ts -t "match"`
Expected: FAIL — `service.match is not a function`.

- [ ] **Step 4: Implement `match`, `extractCriteria`, and helpers**

In `backend/src/recommendations/recommendations.service.ts`:

Update imports at the top to add the new symbols (keep the existing `Type` import from `@google/genai`):

```ts
import { DoctorsService } from '../doctors/doctors.service';
import { DoctorRankingService, MatchCriteria } from './doctor-ranking.service';
import { toPublicDoctorProfile } from '../doctors/dto/public-doctor.dto';
import { MatchResult, MatchedDoctor } from './dto/match-result.dto';
```

Add the two new dependencies to the constructor:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly doctors: DoctorsService,
    private readonly ranking: DoctorRankingService,
  ) {}
```

Add a `RawCriteria` type just below the existing `PatientContext` type:

```ts
type RawCriteria = MatchCriteria & {
  emergency: boolean;
  explanation: string;
};
```

Add these methods inside the class (place them after `createStream`):

```ts
  private async resolvePatientContext(userId: string | null): Promise<{
    patientId: string | null;
    patientContext?: PatientContext;
  }> {
    if (!userId) return { patientId: null };
    const patientProfile = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    const patientId = patientProfile?.id ?? null;
    if (!patientId) return { patientId: null };

    const recentLogs = await this.prisma.recommendationLog.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { matchedSpecialization: true, symptomInput: true },
    });
    const medHistory = await this.prisma.patientMedicalHistory.findUnique({
      where: { patientId },
    });
    return {
      patientId,
      patientContext: {
        specializations: recentLogs.map((l) => l.matchedSpecialization),
        symptoms: recentLogs.map((l) => l.symptomInput),
        medicalHistory: medHistory
          ? {
              allergies: medHistory.allergies,
              chronicConditions: medHistory.chronicConditions,
              currentMedications: medHistory.currentMedications,
            }
          : undefined,
      },
    };
  }

  private buildMatchPrompt(
    symptomInput: string,
    patientContext?: PatientContext,
  ): string {
    const mh = patientContext?.medicalHistory;
    const hasHistory =
      !!mh &&
      (mh.allergies.length > 0 ||
        mh.chronicConditions.length > 0 ||
        mh.currentMedications.length > 0);
    const historyBlock = hasHistory
      ? `- Allergies: ${mh!.allergies.join(', ') || 'none'}
- Chronic conditions: ${mh!.chronicConditions.join(', ') || 'none'}
- Current medications: ${mh!.currentMedications.join(', ') || 'none'}
`
      : '';
    const contextBlock = patientContext
      ? `Patient context (use to personalize):
- Recent specializations consulted: ${patientContext.specializations.join(', ') || 'none'}
- Prior symptom history (brief): ${patientContext.symptoms.map((s) => s.slice(0, 100)).join(' | ') || 'none'}
${historyBlock}
`
      : '';

    return `You are a medical triage and doctor-matching assistant. ${contextBlock}A patient writes: "${symptomInput}".

This text may describe symptoms, an explicit doctor preference, or both. Do two things:
1. Infer the single most relevant medical specialization (or null if truly unclear).
2. Extract any explicit filters the patient mentions: city, region, minimum years of experience (minYears), minimum star rating 1-5 (minRating). Leave a field null if not mentioned.

Return ONLY valid JSON, no markdown:
{ "specialization": <name or null>, "city": <string|null>, "region": <string|null>, "minYears": <number|null>, "minRating": <number|null>, "emergency": <boolean>, "explanation": "<2-3 sentence reasoning>" }

specialization must be one of: Cardiology, Dermatology, Orthopedics, Neurology, Gastroenterology, Ophthalmology, Dentistry, Pediatrics, Gynecology, Psychiatry, General Practice, EMERGENCY — or null.

Set emergency true ONLY for life-threatening symptoms (chest pain, stroke, difficulty breathing, heavy bleeding, unconscious, seizure, suicide, self-harm, poisoning).`;
  }

  private async extractCriteria(
    symptomInput: string,
    patientContext?: PatientContext,
  ): Promise<RawCriteria> {
    const schema = {
      type: Type.OBJECT,
      properties: {
        specialization: { type: Type.STRING, nullable: true },
        city: { type: Type.STRING, nullable: true },
        region: { type: Type.STRING, nullable: true },
        minYears: { type: Type.NUMBER, nullable: true },
        minRating: { type: Type.NUMBER, nullable: true },
        emergency: { type: Type.BOOLEAN },
        explanation: { type: Type.STRING },
      },
      required: ['emergency', 'explanation'],
    };
    const prompt = this.buildMatchPrompt(symptomInput, patientContext);
    return this.gemini.generateJson<RawCriteria>(prompt, { schema });
  }

  private normalizeCriteria(raw: RawCriteria): MatchCriteria {
    const known = VALID_SPECIALIZATIONS.map((s) => s.toLowerCase());
    const spec =
      raw.specialization &&
      known.includes(raw.specialization.toLowerCase()) &&
      raw.specialization.toUpperCase() !== 'EMERGENCY'
        ? raw.specialization
        : null;
    return {
      specialization: spec,
      city: raw.city ?? null,
      region: raw.region ?? null,
      minYears: raw.minYears ?? null,
      minRating: raw.minRating ?? null,
    };
  }

  async match(
    userId: string | null,
    dto: CreateRecommendationDto,
  ): Promise<MatchResult> {
    const { patientId, patientContext } =
      await this.resolvePatientContext(userId);

    const raw = await this.extractCriteria(dto.symptomInput, patientContext);
    const emergency =
      raw.emergency || raw.specialization?.toUpperCase() === 'EMERGENCY';
    const criteria = this.normalizeCriteria(raw);

    try {
      await this.prisma.recommendationLog.create({
        data: {
          patientId,
          symptomInput: dto.symptomInput,
          matchedSpecialization: emergency
            ? 'EMERGENCY'
            : (criteria.specialization ?? 'General Practice'),
          aiExplanation: raw.explanation,
        },
      });
    } catch (error) {
      console.error('Failed to save recommendation log to database', error);
    }

    if (emergency) {
      return { explanation: raw.explanation, criteria, emergency: true, doctors: [] };
    }

    const candidates = await this.doctors.findRankingCandidates();
    const ranked = this.ranking.rank(criteria, candidates).slice(0, 20);
    const doctors: MatchedDoctor[] = ranked.map((d) => ({
      ...toPublicDoctorProfile(d),
      avgRating: d.avgRating,
      reviewCount: d.reviewCount,
      matchScore: d.matchScore,
      matchReason: d.matchReason,
    }));

    return { explanation: raw.explanation, criteria, emergency: false, doctors };
  }
```

- [ ] **Step 5: Wire the module**

Replace the contents of `backend/src/recommendations/recommendations.module.ts` with:

```ts
import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { DoctorRankingService } from './doctor-ranking.service';
import { AiModule } from '../infrastructure/ai/ai.module';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [AiModule, DoctorsModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, DoctorRankingService],
})
export class RecommendationsModule {}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npx jest src/recommendations/recommendations.service.spec.ts`
Expected: PASS (existing `createStream` test + new `match` tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/recommendations/recommendations.service.ts backend/src/recommendations/recommendations.service.spec.ts backend/src/recommendations/recommendations.module.ts backend/src/recommendations/dto/match-result.dto.ts
git commit -m "feat(recommendations): context-aware match() with AI criteria extraction"
```

---

## Task 4: Backend — POST /recommendations/match endpoint

**Files:**
- Modify: `backend/src/recommendations/recommendations.controller.ts`
- Test: `backend/src/recommendations/recommendations.controller.spec.ts` (create)

- [ ] **Step 1: Write the failing controller test**

Create `backend/src/recommendations/recommendations.controller.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;

  const mockService = {
    createStream: jest.fn(),
    findAllForPatient: jest.fn(),
    match: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [{ provide: RecommendationsService, useValue: mockService }],
    }).compile();
    controller = module.get<RecommendationsController>(RecommendationsController);
    jest.clearAllMocks();
  });

  describe('match', () => {
    it('passes the authenticated user id to the service', async () => {
      const payload = { explanation: 'x', criteria: {}, emergency: false, doctors: [] };
      mockService.match.mockResolvedValue(payload);

      const result = await controller.match(
        { user: { id: 'user-1' } },
        { symptomInput: 'dentist in Manila' },
      );

      expect(mockService.match).toHaveBeenCalledWith('user-1', {
        symptomInput: 'dentist in Manila',
      });
      expect(result).toBe(payload);
    });

    it('passes null when the request is anonymous', async () => {
      mockService.match.mockResolvedValue({ doctors: [] });

      await controller.match({}, { symptomInput: 'skin rash help' });

      expect(mockService.match).toHaveBeenCalledWith(null, {
        symptomInput: 'skin rash help',
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/recommendations/recommendations.controller.spec.ts`
Expected: FAIL — `controller.match is not a function`.

- [ ] **Step 3: Add the endpoint**

In `backend/src/recommendations/recommendations.controller.ts`, add the `match` handler. Insert it after the existing `create` method (the streaming POST). The `@OptionalJwt`, `@UseGuards(JwtAuthGuard)`, `@Post`, `@Body`, `@Request` imports/decorators already exist in this file:

```ts
  @Post('match')
  @OptionalJwt()
  @UseGuards(JwtAuthGuard)
  async match(
    @Request() req: { user?: { id?: string } },
    @Body() createRecommendationDto: CreateRecommendationDto,
  ) {
    const userId = req.user?.id ?? null;
    return this.recommendationsService.match(userId, createRecommendationDto);
  }
```

- [ ] **Step 4: Run test + full backend suite + build**

Run: `cd backend && npx jest src/recommendations && npm run build`
Expected: PASS; build succeeds with no TS errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/recommendations/recommendations.controller.ts backend/src/recommendations/recommendations.controller.spec.ts
git commit -m "feat(recommendations): add POST /recommendations/match endpoint"
```

---

## Task 5: Frontend — match result types

**Files:**
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Add the types**

In `frontend/src/types/api.ts`, add after the `DoctorProfile` interface (or anywhere at top level):

```ts
export interface MatchCriteria {
  specialization: string | null;
  city: string | null;
  region: string | null;
  minYears: number | null;
  minRating: number | null;
}

export interface MatchedDoctor extends DoctorProfile {
  matchScore: number;
  matchReason: string;
}

export interface MatchResult {
  explanation: string;
  criteria: MatchCriteria;
  emergency: boolean;
  doctors: MatchedDoctor[];
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from `types/api.ts` (page.tsx errors from later tasks may not exist yet; this file alone must be clean).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(recommendations): add MatchResult/MatchedDoctor frontend types"
```

---

## Task 6: Frontend — ResultsStep renders ranked doctor cards

**Files:**
- Modify: `frontend/src/components/recommendations/results-step.tsx`
- Test: `frontend/src/components/recommendations/results-step.test.tsx` (create)

> Note: after this task `page.tsx` will not type-check (it still passes the old props). That is fixed in Task 7. In this task, run only the results-step test, not full `tsc`.

- [ ] **Step 1: Write the failing component test**

Create `frontend/src/components/recommendations/results-step.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultsStep } from "./results-step";
import type { MatchResult } from "@/types/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function buildResult(over: Partial<MatchResult> = {}): MatchResult {
  return {
    explanation: "A dentist suits your request.",
    criteria: { specialization: "Dentistry", city: "Manila", region: null, minYears: 5, minRating: null },
    emergency: false,
    doctors: [
      {
        id: "doc-1",
        fullName: "Jane Cruz",
        professionalTitle: "Dr.",
        specialization: "Dentistry",
        isVerified: true,
        yearsOfExperience: 8,
        avgRating: 4.6,
        reviewCount: 12,
        matchScore: 1,
        matchReason: "Dentistry · Manila · 8 yrs (≥5 ✓)",
      },
    ],
    ...over,
  };
}

describe("ResultsStep", () => {
  it("renders the explanation and a ranked doctor card with its match reason", () => {
    render(<ResultsStep result={buildResult()} onRestart={vi.fn()} isAnalyzing={false} />);
    expect(screen.getByText("A dentist suits your request.")).toBeInTheDocument();
    expect(screen.getByText("Jane Cruz")).toBeInTheDocument();
    expect(screen.getByText(/Manila · 8 yrs/)).toBeInTheDocument();
  });

  it("shows an empty-state message when no doctors match", () => {
    render(
      <ResultsStep result={buildResult({ doctors: [] })} onRestart={vi.fn()} isAnalyzing={false} />,
    );
    expect(screen.getByText(/no matching doctors/i)).toBeInTheDocument();
  });

  it("renders the emergency screen when emergency is true", () => {
    render(
      <ResultsStep
        result={buildResult({ emergency: true, doctors: [] })}
        onRestart={vi.fn()}
        isAnalyzing={false}
      />,
    );
    expect(screen.getByText(/Emergency/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /911/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/recommendations/results-step.test.tsx`
Expected: FAIL — type/props mismatch or missing doctor rendering.

- [ ] **Step 3: Rewrite ResultsStep**

Replace the full contents of `frontend/src/components/recommendations/results-step.tsx` with:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { DoctorCard } from "@/components/doctors/doctor-card";
import type { MatchResult } from "@/types/api";

interface ResultsStepProps {
  result: MatchResult | null;
  onRestart: () => void;
  isAnalyzing: boolean;
}

export function ResultsStep({ result, onRestart, isAnalyzing }: ResultsStepProps) {
  if (!result && !isAnalyzing) return null;

  if (isAnalyzing && !result) {
    return (
      <FadeIn>
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-text-primary font-serif">Finding your matches...</h2>
            <p className="text-on-surface-variant">Reading your request and ranking doctors.</p>
          </div>
          <Card className="p-10 shadow-lifted rounded-3xl bg-surface-white">
            <div className="h-32 animate-pulse rounded-2xl bg-surface-container-low" />
          </Card>
        </div>
      </FadeIn>
    );
  }

  if (!result) return null;

  if (result.emergency) {
    return (
      <FadeIn>
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-error font-serif italic uppercase tracking-tighter">Emergency Detected</h2>
            <p className="text-on-surface-variant font-medium">Please prioritize your safety immediately.</p>
          </div>
          <Card className="overflow-hidden border-2 border-error shadow-lifted rounded-3xl bg-red-50/50">
            <div className="bg-error p-8 text-center text-white space-y-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2 animate-pulse">
                <ExclamationTriangleIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-4xl font-bold font-serif leading-tight">Seek Emergency Care Immediately</h3>
            </div>
            <div className="p-8 space-y-8">
              <p className="text-on-surface-variant text-lg leading-relaxed text-center font-medium">
                {result.explanation}{" "}
                <strong>Please do not book a telehealth consultation.</strong>
              </p>
              <div className="space-y-4">
                <Button size="lg" variant="destructive" className="w-full py-8 text-xl rounded-2xl shadow-soft font-bold animate-bounce" asChild>
                  <a href="tel:911">Call 911 Now</a>
                </Button>
                <Button variant="outline" size="lg" className="w-full py-8 text-lg rounded-2xl border-error text-error hover:bg-red-50" onClick={onRestart}>
                  Go back & edit
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </FadeIn>
    );
  }

  const spec = result.criteria.specialization;

  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-text-primary font-serif">Your Matches</h2>
          <p className="text-on-surface-variant">
            Based on your request, ranked by how closely each doctor fits.
          </p>
        </div>

        <Card className="overflow-hidden border border-outline-variant/30 shadow-lifted rounded-3xl">
          <div className="bg-gradient-to-br from-primary to-primary-container p-8 text-center text-white relative">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
            <p className="text-sm uppercase tracking-widest font-bold opacity-90 mb-2 relative z-10">
              {spec ? "Recommended Specialty" : "Recommendation"}
            </p>
            {spec && <h3 className="text-3xl md:text-4xl font-bold font-serif relative z-10">{spec}</h3>}
          </div>
          <div className="p-8 bg-surface-white">
            <p className="text-on-surface-variant text-base leading-relaxed italic border-l-4 border-primary/40 pl-5">
              {result.explanation}
            </p>
          </div>
        </Card>

        {result.doctors.length === 0 ? (
          <Card className="p-10 text-center space-y-4 rounded-3xl border border-outline-variant/30">
            <p className="text-on-surface-variant font-medium">No matching doctors yet.</p>
            <Button variant="outline" size="lg" asChild className="rounded-2xl">
              <Link href="/doctors">Browse all specialists</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-5">
            {result.doctors.map((doctor) => (
              <div key={doctor.id} className="space-y-2">
                <DoctorCard doctor={doctor} isPatient={true} />
                {doctor.matchReason && (
                  <div className="flex items-center gap-2 px-2">
                    <span className="inline-flex items-center rounded-full bg-secondary-container/40 px-3 py-1 text-xs font-semibold text-on-secondary-container">
                      Why this match: {doctor.matchReason}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Button variant="outline" size="lg" asChild className="rounded-2xl font-semibold border-outline-variant/60">
            <Link href="/doctors">Browse all specialists</Link>
          </Button>
          <button
            onClick={onRestart}
            className="text-primary font-semibold hover:text-primary/80 transition-colors"
            aria-label="Start a new search"
          >
            Start a new search
          </button>
        </div>
      </div>
    </FadeIn>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/recommendations/results-step.test.tsx`
Expected: PASS (all 3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/recommendations/results-step.tsx frontend/src/components/recommendations/results-step.test.tsx
git commit -m "feat(recommendations): ResultsStep renders ranked doctor cards with reasons"
```

---

## Task 7: Frontend — page match fetch + loader + dual-intent copy

**Files:**
- Modify: `frontend/src/app/recommendations/page.tsx`
- Modify: `frontend/src/components/recommendations/symptoms-step.tsx`
- Modify: `frontend/src/app/recommendations/page.test.tsx`

- [ ] **Step 1: Relabel SymptomsStep for dual intent**

In `frontend/src/components/recommendations/symptoms-step.tsx`, change only the heading and helper copy. Replace:

```tsx
          <h2 className="text-3xl font-bold text-text-primary font-serif">Tell us what&apos;s happening</h2>
          <p className="text-on-surface-variant">
            Take your time and describe what&apos;s bothering you. You can type or use your voice.
          </p>
```
with:
```tsx
          <h2 className="text-3xl font-bold text-text-primary font-serif">What are you looking for?</h2>
          <p className="text-on-surface-variant">
            Describe your symptoms — or the kind of doctor you want (e.g. &quot;dentist in Manila with 5+ years&quot;). Type or use your voice.
          </p>
```

Also change the placeholder on the textarea from the symptom-only example to:
```tsx
                placeholder="e.g., I've had a headache for 3 days — or: a pediatrician in Cebu with great reviews"
```

- [ ] **Step 2: Rewrite the page data flow**

In `frontend/src/app/recommendations/page.tsx`:

Remove the `partial-json` import (`import { parse } from 'partial-json';`) and the streaming state. Replace the `RecommendationLog` import line with both types:

```ts
import type { RecommendationLog, MatchResult } from "@/types/api";
```

Replace the result/streaming state declarations:

```ts
  const [result, setResult] = useState<RecommendationLog | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingSpecialization, setStreamingSpecialization] = useState<string | null>(null);
  const [streamingExplanation, setStreamingExplanation] = useState<string>("");
```
with:
```ts
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
```

Replace the entire `handleAnalyze` function with a single-request version:

```ts
  const handleAnalyze = async () => {
    if (symptoms.trim().length < 10) return;

    setIsAnalyzing(true);
    setError(null);
    setStep(3);
    setResult(null);

    try {
      const data = await apiRequest<MatchResult>("/recommendations/match", {
        method: "POST",
        token,
        body: JSON.stringify({ symptomInput: symptoms }),
      });
      setResult(data);
      if (token) loadHistory();
    } catch {
      setError("Something went wrong. Please try again.");
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };
```

Replace `handleRestart` to drop the removed streaming setters:

```ts
  const handleRestart = () => {
    setStep(1);
    setSymptoms("");
    setResult(null);
    setError(null);
  };
```

Update the `<ResultsStep .../>` usage to the new props:

```tsx
          {step === 3 && (
            <ResultsStep
              result={result}
              onRestart={handleRestart}
              isAnalyzing={isAnalyzing}
            />
          )}
```

(The streaming `fetch`/`reader`/`decoder` logic is fully removed. `apiRequest` is already imported in this file.)

- [ ] **Step 3: Update the page test**

Replace the full contents of `frontend/src/app/recommendations/page.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecommendationsPage from "./page";

const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
}));

vi.mock("@/hooks/use-speech-recognition", () => ({
  useSpeechRecognition: () => ({
    isRecording: false,
    isProcessing: false,
    isSupported: false,
    error: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  }),
}));

const apiRequest = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

describe("RecommendationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("symptoms");
  });

  it("renders the welcome step initially", () => {
    render(<RecommendationsPage />);
    expect(
      screen.getByRole("heading", { name: /Find the Right Specialist/i }),
    ).toBeInTheDocument();
  });

  it("advances to the input step on start", async () => {
    const user = userEvent.setup();
    render(<RecommendationsPage />);
    await user.click(screen.getByRole("button", { name: /Start/i }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("fetches matches and renders ranked doctor cards", async () => {
    apiRequest.mockResolvedValue({
      explanation: "A dentist suits your request.",
      criteria: { specialization: "Dentistry", city: "Manila", region: null, minYears: 5, minRating: null },
      emergency: false,
      doctors: [
        {
          id: "doc-1",
          fullName: "Jane Cruz",
          professionalTitle: "Dr.",
          specialization: "Dentistry",
          isVerified: true,
          yearsOfExperience: 8,
          avgRating: 4.6,
          reviewCount: 12,
          matchScore: 1,
          matchReason: "Dentistry · Manila · 8 yrs (≥5 ✓)",
        },
      ],
    });

    const user = userEvent.setup();
    render(<RecommendationsPage />);
    await user.click(screen.getByRole("button", { name: /Start/i }));
    await user.type(screen.getByRole("textbox"), "dentist in Manila with 5 years");
    await user.click(screen.getByRole("button", { name: /Find My Specialist/i }));

    await waitFor(() => expect(screen.getByText("Jane Cruz")).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith(
      "/recommendations/match",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
```

- [ ] **Step 4: Verify types + tests + build**

Run: `cd frontend && npx tsc --noEmit && npx vitest run && npx next build`
Expected: no TS errors; all tests pass; production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/recommendations/page.tsx frontend/src/app/recommendations/page.test.tsx frontend/src/components/recommendations/symptoms-step.tsx
git commit -m "feat(recommendations): page calls /match and renders ranked doctors"
```

---

## Task 8: Full verification + cleanup

**Files:** none (verification + deletion).

- [ ] **Step 1: Full backend gate**

Run: `cd backend && npx jest && npm run build && npm run lint`
Expected: all suites pass; build clean; lint clean.

- [ ] **Step 2: Full frontend gate**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: all suites pass; no type errors; lint clean.

- [ ] **Step 3: Manual sanity check (optional but recommended)**

With backend + frontend running locally, `POST /recommendations/match` with
`{ "symptomInput": "I need a dentist in Manila with at least 5 years of experience" }`
returns `emergency:false`, a non-empty `doctors` array (if seeded), and sensible
`matchReason` strings. An emergency phrase ("crushing chest pain, can't breathe")
returns `emergency:true` with `doctors: []`.

- [ ] **Step 4: Delete the spec and plan files**

Per the standing user preference, once everything above is green, remove both planning
documents:

```bash
git rm docs/superpowers/specs/2026-05-30-context-aware-recommendations-design.md docs/superpowers/plans/2026-05-30-context-aware-recommendations.md
git commit -m "chore: remove context-aware recommendations spec and plan after completion"
```

- [ ] **Step 5: Report**

Summarize: endpoints added, files changed, test counts (backend before 116, frontend
before 105), and confirm the notifications branch was never touched.

---

## Self-Review Notes

- **Spec coverage:** AI criteria extraction (Task 3 `extractCriteria`), scored ranking + renormalization + reasons (Task 1), candidate pool (Task 2), match orchestration + emergency short-circuit + log best-effort (Task 3), `POST /match` optional-jwt (Task 4), frontend types (Task 5), ranked cards + empty/emergency states (Task 6), single-request page + dual-intent copy (Task 7), full gate + cleanup (Task 8). All spec sections mapped.
- **Type consistency:** `MatchCriteria` / `RankedDoctor` / `ScorableDoctor` (Task 1) → `MatchedDoctor` / `MatchResult` (Task 3 DTO, Task 5 frontend mirror) → consumed unchanged in Tasks 6–7. `findRankingCandidates` (Task 2) is the exact name called in Task 3. `match(userId, dto)` signature identical across service (Task 3) and controller (Task 4).
- **No placeholders:** every code step shows complete code; commands have expected output.
- **Scope:** confined to `recommendations/` + `doctors.service.ts` + 3 frontend files + types. No overlap with `feature/realtime-notifications` (notifications module untouched).
