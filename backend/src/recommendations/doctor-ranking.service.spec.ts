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
    const wrongCity = doctor({
      id: 'wrong',
      city: 'Cebu',
      region: 'Central Visayas',
    });
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
      doctor({
        id: 'd',
        yearsOfExperience: null,
        avgRating: 0,
        reviewCount: 0,
      }),
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
    const ranked = service.rank({ ...base, specialization: 'Cardiology' }, [
      b,
      a,
    ]);
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
    expect(service.rank({ ...base, specialization: 'Dentistry' }, [])).toEqual(
      [],
    );
  });
});
