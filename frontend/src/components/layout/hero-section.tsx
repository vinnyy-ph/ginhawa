import { SymptomWidget } from "@/components/ui/symptom-widget";
import { FadeIn } from "@/components/ui/fade-in";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-20 lg:py-32">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 h-[600px] w-[600px] rounded-full bg-primary-container/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 h-[400px] w-[400px] rounded-full bg-secondary-container/10 blur-3xl" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 relative z-10">
        <FadeIn>
          <div className="flex flex-col items-center text-center">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-text-primary sm:text-6xl mb-6 font-serif">
              Not sure which doctor to see?{" "}
              <span className="text-primary">Describe your symptoms</span>, and we&apos;ll guide you.
            </h1>

            <p className="max-w-2xl text-lg text-on-surface-variant mb-10 leading-relaxed">
              Ginhawa&apos;s AI matches your symptoms to the right specialist — in seconds, before you book anything.
            </p>

            <SymptomWidget />

            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-text-primary">AI-Powered</span>
                <span className="text-sm text-on-surface-variant">Symptom Analysis</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-text-primary">Free to Use</span>
                <span className="text-sm text-on-surface-variant">No credit card</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-text-primary">No Account</span>
                <span className="text-sm text-on-surface-variant">Start immediately</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-text-primary">100% Secure</span>
                <span className="text-sm text-on-surface-variant">Private & encrypted</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
