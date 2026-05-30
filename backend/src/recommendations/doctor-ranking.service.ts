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
