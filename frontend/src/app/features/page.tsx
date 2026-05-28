import React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FadeIn } from "@/components/ui/fade-in";
import { 
  ActivityLogIcon, 
  CalendarIcon, 
  VideoIcon, 
  ClipboardIcon 
} from "@radix-ui/react-icons";

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

        {/* ── The Narrative Journey ────────────────────────────────────── */}
        <section className="py-24 bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
            
            {/* Step 1: AI Matching */}
            <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-24">
              <div className="flex-1 w-full">
                <FadeIn direction="up">
                  <div className="space-y-6">
                    <span className="text-primary font-bold tracking-widest uppercase text-sm">Step 1</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-text-primary font-serif">AI-Powered Symptom Matching</h2>
                    <p className="text-lg text-on-surface-variant leading-relaxed">
                      Not sure who to see? Describe your symptoms in your own words, and our advanced medical AI instantly guides you to the exact specialist you need.
                    </p>
                  </div>
                </FadeIn>
              </div>
              <div className="flex-1 w-full">
                <FadeIn direction="up" delay={0.2}>
                  <div className="aspect-[4/3] rounded-3xl bg-surface-container-lowest shadow-soft border border-outline-variant/30 flex items-center justify-center p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent pointer-events-none" />
                    <div className="w-full max-w-sm space-y-4 relative z-10">
                      <div className="bg-surface-white p-4 rounded-2xl border border-outline-variant/20 shadow-sm flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-low shrink-0 mt-1" />
                        <div className="space-y-2 flex-1">
                          <div className="h-2 w-3/4 bg-surface-container rounded" />
                          <div className="h-2 w-1/2 bg-surface-container rounded" />
                        </div>
                      </div>
                      <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 flex flex-col items-center justify-center gap-3">
                        <ActivityLogIcon className="w-8 h-8 text-primary" />
                        <span className="text-primary font-bold text-sm">Recommended: Cardiologist</span>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>

            {/* Step 2: Scheduling */}
            <div className="flex flex-col-reverse lg:flex-row-reverse items-center gap-12 lg:gap-24">
              <div className="flex-1 w-full">
                <FadeIn direction="up">
                  <div className="space-y-6">
                    <span className="text-primary font-bold tracking-widest uppercase text-sm">Step 2</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-text-primary font-serif">Frictionless Scheduling</h2>
                    <p className="text-lg text-on-surface-variant leading-relaxed">
                      Browse real-time availability for top board-certified doctors in the Philippines. Book, reschedule, or cancel your appointment instantly with zero friction.
                    </p>
                  </div>
                </FadeIn>
              </div>
              <div className="flex-1 w-full">
                <FadeIn direction="up" delay={0.2}>
                  <div className="aspect-[4/3] rounded-3xl bg-surface-container-lowest shadow-soft border border-outline-variant/30 flex items-center justify-center p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-bl from-secondary-container/10 to-transparent pointer-events-none" />
                    <div className="w-full max-w-sm space-y-3 relative z-10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-text-primary">Available Slots</span>
                        <CalendarIcon className="w-5 h-5 text-on-surface-variant" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="py-3 bg-surface-white border border-outline-variant/30 rounded-xl text-center text-sm font-semibold text-on-surface-variant">09:00 AM</div>
                        <div className="py-3 bg-primary text-white shadow-md rounded-xl text-center text-sm font-bold">10:30 AM</div>
                        <div className="py-3 bg-surface-white border border-outline-variant/30 rounded-xl text-center text-sm font-semibold text-on-surface-variant">01:00 PM</div>
                        <div className="py-3 bg-surface-white border border-outline-variant/30 rounded-xl text-center text-sm font-semibold text-on-surface-variant">03:30 PM</div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>

            {/* Step 3: Video */}
            <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-24">
              <div className="flex-1 w-full">
                <FadeIn direction="up">
                  <div className="space-y-6">
                    <span className="text-primary font-bold tracking-widest uppercase text-sm">Step 3</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-text-primary font-serif">Secure Video Consultations</h2>
                    <p className="text-lg text-on-surface-variant leading-relaxed">
                      Meet your doctor face-to-face from the comfort of your home. Our encrypted platform is built specifically for reliability, ensuring a clear connection.
                    </p>
                  </div>
                </FadeIn>
              </div>
              <div className="flex-1 w-full">
                <FadeIn direction="up" delay={0.2}>
                  <div className="aspect-[4/3] rounded-3xl bg-[#0e1a18] shadow-lifted flex flex-col justify-between p-4 relative overflow-hidden">
                    {/* Mock Video Feed */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a2724] to-[#0e1a18]" />
                    <div className="relative z-10 flex justify-end">
                      <div className="bg-[#31a795] px-2 py-1 rounded-md flex items-center gap-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                         <span className="text-[10px] font-bold text-white uppercase">Secure</span>
                      </div>
                    </div>
                    {/* PiP & Controls */}
                    <div className="relative z-10 flex justify-between items-end">
                      <div className="w-24 h-32 bg-surface-container rounded-xl border-2 border-[#31a795]" />
                      <div className="bg-[rgba(14,26,24,0.72)] backdrop-blur-md px-6 py-3 rounded-full flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <VideoIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="w-10 h-10 rounded-full bg-error flex items-center justify-center">
                           <div className="w-4 h-1 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>

            {/* Step 4: Records */}
            <div className="flex flex-col-reverse lg:flex-row-reverse items-center gap-12 lg:gap-24">
              <div className="flex-1 w-full">
                <FadeIn direction="up">
                  <div className="space-y-6">
                    <span className="text-primary font-bold tracking-widest uppercase text-sm">Step 4</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-text-primary font-serif">Digital Health Records</h2>
                    <p className="text-lg text-on-surface-variant leading-relaxed">
                      Access your consultation notes, e-prescriptions, and lab requests anytime in your secure patient portal. Your health history, organized in one place.
                    </p>
                  </div>
                </FadeIn>
              </div>
              <div className="flex-1 w-full">
                <FadeIn direction="up" delay={0.2}>
                  <div className="aspect-[4/3] rounded-3xl bg-surface-container-lowest shadow-soft border border-outline-variant/30 flex items-center justify-center p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-info/10 to-transparent pointer-events-none" />
                    <div className="w-full max-w-xs bg-surface-white rounded-xl border border-outline-variant/20 shadow-md p-6 relative z-10 space-y-6">
                      <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                        <ClipboardIcon className="w-6 h-6 text-primary" />
                        <div className="font-bold text-text-primary">E-Prescription</div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-2 w-3/4 bg-surface-container rounded" />
                        <div className="h-2 w-full bg-surface-container rounded" />
                        <div className="h-2 w-5/6 bg-surface-container rounded" />
                      </div>
                      <div className="pt-2">
                        <div className="h-8 w-24 bg-primary/10 rounded-md" />
                      </div>
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>

          </div>
        </section>

        {/* CTA will go here */}
      </main>

      <Footer />
    </div>
  );
}
