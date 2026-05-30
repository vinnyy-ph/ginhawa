/**
 * resolve-step — shared onboarding flow utility (patient and doctor).
 *
 * Centralises the "which step should actually render?" decision so both the
 * patient and doctor page shells share identical forward-gating logic.
 */

/**
 * Decide which onboarding step slug to render.
 *
 * Applies two rules in order:
 * 1. Unknown or missing slug → first step (safe fallback, not a 404).
 * 2. If `blockSlug` is set (first incomplete prerequisite) and the requested
 *    step sits after it in the ordered array, redirect back to the block slug.
 *    This prevents users from deep-linking past a required step.
 */
export function resolveStepSlug(
  requested: string | null,
  slugs: string[],
  blockSlug: string | null,
): string {
  const fallback = slugs[0];
  if (!requested || !slugs.includes(requested)) return fallback;
  if (blockSlug) {
    const blockIdx = slugs.indexOf(blockSlug);
    const reqIdx = slugs.indexOf(requested);
    if (reqIdx > blockIdx) return blockSlug;
  }
  return requested;
}
