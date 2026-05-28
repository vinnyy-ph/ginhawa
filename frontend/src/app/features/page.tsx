import React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata = {
  title: "Features - Ginhawa Telehealth",
  description: "Discover how Ginhawa simplifies your healthcare journey.",
};

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      
      <main className="flex-grow">
        {/* ── Hero Section ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-surface-white py-24 md:py-32">
          {/* Decorative Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 right-[-10%] h-[600px] w-[600px] rounded-full bg-primary-container/20 blur-3xl" />
            <div className="absolute top-[20%] left-[-10%] h-[400px] w-[400px] rounded-full bg-secondary-container/20 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
            <FadeIn>
              <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide uppercase">
                Why Ginhawa?
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-text-primary leading-tight font-serif tracking-tight mb-6">
                Your journey to better health, simplified.
              </h1>
              <p className="text-on-surface-variant text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
                From understanding your symptoms to getting your prescription, we make healthcare accessible from the comfort of your home.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* Journey steps will go here */}

        {/* CTA will go here */}
      </main>

      <Footer />
    </div>
  );
}
