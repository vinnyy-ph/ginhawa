import { Injectable } from '@nestjs/common';

/** Structured search criteria extracted from a patient's free-text request. */
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

/** A scored doctor: the original record plus a 0–1 score and a readable reason. */
export type RankedDoctor<T> = T & { matchScore: number; matchReason: string };

/** Relative importance of each criterion. Renormalized per-query (see `combine`). */
const WEIGHTS = {
  specialization: 0.5,
  location: 0.2,
  experience: 0.15,
  rating: 0.15,
} as const;

/**
 * Pure, deterministic doctor ranking.
 *
 * Given extracted criteria and a candidate pool, scores each doctor 0–1 on the
 * criteria the patient actually mentioned, then sorts best-first. Has no AI,
 * HTTP, or DB dependency — which is what makes it cheap to unit-test and gives
 * stable, explainable ordering (every result carries a human-readable reason).
 *
 * Key behavior: criteria the patient did NOT mention contribute `null` and are
 * excluded from the weighted average (see `combine`), so e.g. "dentist in
 * Manila" is not penalized for saying nothing about experience or rating.
 */
@Injectable()
export class DoctorRankingService {
  /**
   * Scores and sorts candidates against the criteria.
   * @returns a new array, best match first. Ties break by rating, then experience.
   */
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

  /**
   * Weighted average over only the criteria that were provided (non-null),
   * renormalized by the weights actually in play. With no criteria the score
   * is 0 (nothing to match on).
   */
  private combine(scores: Record<keyof typeof WEIGHTS, number | null>): number {
    let weighted = 0;
    let totalWeight = 0;
    for (const key of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
      const s = scores[key];
      if (s === null) continue; // criterion not requested → excluded entirely
      weighted += WEIGHTS[key] * s;
      totalWeight += WEIGHTS[key];
    }
    return totalWeight === 0 ? 0 : weighted / totalWeight;
  }

  /**
   * 1 if the doctor has the requested specialization (checking both the legacy
   * `specialization` field and the `specializations` relation), else 0.
   * `null` when no specialization was requested.
   */
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

  /**
   * Location fit: 1 for an exact city match, 0.5 for a region-only match
   * (right area, different city), 0 otherwise. `null` when no location asked.
   */
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

  /**
   * Experience fit: 1 if the doctor meets the minimum, otherwise a partial
   * score that degrades linearly with the shortfall (a doctor close to the
   * target still ranks above one far below it). `null` when none requested.
   */
  private scoreExperience(c: MatchCriteria, d: ScorableDoctor): number | null {
    if (c.minYears == null) return null;
    if (c.minYears <= 0) return 1;
    const years = d.yearsOfExperience;
    if (years == null) return 0; // unknown experience can't satisfy a minimum
    if (years >= c.minYears) return 1;
    return Math.max(0, 1 - (c.minYears - years) / c.minYears);
  }

  /**
   * Rating fit: 1 if the average meets the minimum, else proportional to how
   * close it is. Doctors with no reviews score 0 (can't claim to meet a bar
   * they have no evidence for). `null` when no rating was requested.
   */
  private scoreRating(c: MatchCriteria, d: ScorableDoctor): number | null {
    if (c.minRating == null) return null;
    if (c.minRating <= 0) return 1;
    if (d.reviewCount === 0) return 0;
    if (d.avgRating >= c.minRating) return 1;
    return Math.min(1, d.avgRating / c.minRating);
  }

  /**
   * Builds the user-facing "why this matched" string from the criteria that
   * contributed, e.g. `"Dentistry · Manila · 8 yrs (≥5 ✓) · 4.6★"`. A
   * below-target criterion is shown honestly ("(closest)", "you asked 5+").
   */
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
