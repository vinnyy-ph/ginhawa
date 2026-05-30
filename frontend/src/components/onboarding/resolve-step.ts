/**
 * Decide which onboarding step slug to render.
 * - Unknown or missing slug → first step.
 * - If `blockSlug` is set (first incomplete prerequisite) and the requested
 *   step sits after it, redirect back to the block slug.
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
