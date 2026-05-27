// frontend/src/app/onboarding/layout.tsx
import { OnboardingProvider } from '@/context/onboarding-context';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-surface flex flex-col">
        <header className="flex items-center gap-2 px-6 py-4 border-b border-outline-variant bg-surface-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Ginhawa" className="h-7 w-7" />
          <span className="text-sm font-semibold text-primary font-plus-jakarta tracking-wide">
            Ginhawa
          </span>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg">{children}</div>
        </main>
      </div>
    </OnboardingProvider>
  );
}
