// frontend/src/lib/format.ts
// Display formatters for onboarding identifier fields. Each is idempotent:
// it strips its own separators before re-grouping, so re-running on an already
// formatted value is safe.

/** Format up to 10 raw digits as "000 000 0000" (3-3-4). */
export const formatPhone = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(' ');
};

/** Format a PhilHealth ID as "00-000000000-0" (2-9-1, 12 digits). */
export const formatPhilHealth = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 12);
  return [d.slice(0, 2), d.slice(2, 11), d.slice(11, 12)].filter(Boolean).join('-');
};

/** Format an HMO card no. as uppercase alphanumeric grouped every 4 chars with dashes. */
export const formatHmoCard = (value: string) => {
  const c = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16);
  return (c.match(/.{1,4}/g) ?? []).join('-');
};
