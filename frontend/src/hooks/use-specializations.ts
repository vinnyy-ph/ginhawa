'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';

/** Fetches specialization names from the public GET /specializations endpoint. */
export function useSpecializations() {
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest<{ id: string; name: string }[]>('/specializations', { method: 'GET' })
      .then((rows) => {
        if (active) setSpecializations(rows.map((r) => r.name));
      })
      .catch(() => {
        if (active) setSpecializations([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { specializations, loading };
}
