// frontend/src/lib/onboarding-styles.ts
// Single source of truth for onboarding text-input styling.
// Mirrors DESIGN.md: rounded-md (0.75rem) idle border, primary focus ring,
// Manrope body, error border via aria-invalid.
export const onboardingInputClass =
  'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';

export const onboardingTextareaClass =
  'w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline transition-colors resize-y min-h-[80px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error';
