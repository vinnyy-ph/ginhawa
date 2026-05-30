import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ForDoctorsHero } from '@/components/for-doctors/for-doctors-hero';
import { CapabilitiesSection } from '@/components/for-doctors/capabilities-section';
import { WorkflowSection } from '@/components/for-doctors/workflow-section';
import { ForDoctorsCta } from '@/components/for-doctors/for-doctors-cta';

export const metadata = {
  title: 'Ginhawa for Doctors — Calm workflows for clinical care',
  description:
    'A doctor-first telehealth workflow for schedules, patient context, and post-consult documentation — built for trust in the Philippines.',
};

export default function ForDoctorsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <ForDoctorsHero />
        <CapabilitiesSection />
        <WorkflowSection />
        <ForDoctorsCta />
      </main>

      <Footer />
    </div>
  );
}
