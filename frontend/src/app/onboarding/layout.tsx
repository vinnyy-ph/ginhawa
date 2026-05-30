// frontend/src/app/onboarding/layout.tsx
import { OnboardingProvider } from '@/providers/onboarding-context';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}
