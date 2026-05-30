import { DoctorOnboardingProvider } from '@/context/doctor-onboarding-context';

export default function DoctorOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DoctorOnboardingProvider>{children}</DoctorOnboardingProvider>;
}
