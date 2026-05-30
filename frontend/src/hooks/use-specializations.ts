'use client';

/**
 * Hook that fetches the list of medical specializations from the public API
 * and returns them as a sorted array of name strings. Uses an `active` flag
 * to prevent state updates after unmount (abort-on-unmount pattern without
 * requiring an AbortController).
 */
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';

/**
 * Fetches specialization names from the public GET /specializations endpoint.
 * Falls back to an empty list on error so callers never receive undefined.
 *
 * @returns `specializations` — sorted array of name strings, and `loading`.
 */
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
