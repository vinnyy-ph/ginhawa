import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { apiRequest } from "@/lib/api-client";
import { Header } from "@/components/layout/header";
import { HeroSection } from "@/components/layout/hero-section";
import { HowItWorksSection } from "@/components/layout/how-it-works-section";
import { FeaturesSection } from "@/components/layout/features-section";
import { ShowcaseSection } from "@/components/layout/showcase-section";
import { TestimonialsSection } from "@/components/layout/testimonials-section";
import { FAQSection } from "@/components/layout/faq-section";
import { CTASection } from "@/components/layout/cta-section";
import { Footer } from "@/components/layout/footer";
import { PatientHome } from "./patient-home";

function Marketing() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <ShowcaseSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) return <Marketing />;

  if (session.user?.role === "DOCTOR") redirect("/doctor/dashboard");

  // PATIENT: onboarding guard (moved from old /dashboard/page.tsx)
  const token = session.user?.accessToken;
  let hasProfile = false;
  if (token) {
    try {
      await apiRequest("/patients/profile", { token });
      hasProfile = true;
    } catch {
      hasProfile = false;
    }
  }
  if (!hasProfile) redirect("/onboarding/1");

  return <PatientHome />;
}
