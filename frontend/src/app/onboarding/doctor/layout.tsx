import { DoctorOnboardingProvider } from '@/context/doctor-onboarding-context';

export default function DoctorOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DoctorOnboardingProvider>
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-surface-white rounded-3xl shadow-sm border border-outline-variant p-8 md:p-12 relative overflow-hidden">
          {children}
        </div>
      </div>
    </DoctorOnboardingProvider>
  );
}
