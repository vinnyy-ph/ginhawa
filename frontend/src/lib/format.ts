// frontend/src/lib/format.ts

/**
 * Formatting and validation helpers for structured identifier fields used
 * during patient and doctor onboarding (phone, PhilHealth, HMO, PRC, PTR).
 *
 * All formatters are idempotent: they strip their own separator characters
 * before re-grouping digits, so calling a formatter on an already-formatted
 * value produces the same result without duplication.
 */
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
  const c = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
  return (c.match(/.{1,4}/g) ?? []).join('-');
};

/** Valid when empty (optional) or a complete 12-digit PhilHealth ID. */
export const isValidPhilHealth = (value: string) => {
  const d = value.replace(/\D/g, '');
  return d.length === 0 || d.length === 12;
};

/** Valid when empty (optional) or exactly 12 alphanumeric HMO card characters. */
export const isValidHmoCard = (value: string) => {
  const c = value.replace(/[^a-zA-Z0-9]/g, '');
  return c.length === 0 || c.length === 12;
};

/** Format a PRC license no. as up to 7 raw digits (no separators). */
export const formatPrc = (value: string) => value.replace(/\D/g, '').slice(0, 7);

/** Valid when the PRC license no. is exactly 7 digits. */
export const isValidPrc = (value: string) => value.replace(/\D/g, '').length === 7;

/** Format a PTR no. as up to 8 raw digits (no separators). */
export const formatPtr = (value: string) => value.replace(/\D/g, '').slice(0, 8);

/** Valid when empty (optional) or 7–8 digits. */
export const isValidPtr = (value: string) => {
  const len = value.replace(/\D/g, '').length;
  return len === 0 || len === 7 || len === 8;
};
