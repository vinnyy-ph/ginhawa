import { DoctorOnboardingProvider } from '@/providers/doctor-onboarding-context';

export default function DoctorOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DoctorOnboardingProvider>{children}</DoctorOnboardingProvider>;
}
