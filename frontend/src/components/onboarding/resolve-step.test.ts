import { describe, it, expect } from 'vitest';
import { resolveStepSlug } from './resolve-step';

const slugs = ['personal', 'location', 'review'];

describe('resolveStepSlug', () => {
  it('falls back to the first slug when none is requested', () => {
    expect(resolveStepSlug(null, slugs, null)).toBe('personal');
  });

  it('falls back to the first slug when the requested slug is unknown', () => {
    expect(resolveStepSlug('bogus', slugs, null)).toBe('personal');
  });

  it('returns the requested slug when nothing blocks it', () => {
    expect(resolveStepSlug('location', slugs, null)).toBe('location');
  });

  it('redirects to the block slug when the requested step is past it', () => {
    expect(resolveStepSlug('review', slugs, 'personal')).toBe('personal');
  });

  it('allows the requested step when it is at or before the block slug', () => {
    expect(resolveStepSlug('personal', slugs, 'personal')).toBe('personal');
  });
});
