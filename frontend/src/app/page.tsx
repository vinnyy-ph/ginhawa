import { Header } from "@/components/layout/header";
import { HeroSection } from "@/components/layout/hero-section";
import { FeaturesSection } from "@/components/layout/features-section";
import { ShowcaseSection } from "@/components/layout/showcase-section";
import { TestimonialsSection } from "@/components/layout/testimonials-section";
import { FAQSection } from "@/components/layout/faq-section";
import { CTASection } from "@/components/layout/cta-section";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <HeroSection />
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
