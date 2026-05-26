import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, StarFilledIcon } from "@radix-ui/react-icons";
import { FadeIn } from "@/components/ui/fade-in";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-20 lg:py-32">
      {/* Background organic shape decorative element */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 h-[600px] w-[600px] rounded-full bg-primary-container/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 h-[400px] w-[400px] rounded-full bg-secondary-container/10 blur-3xl" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 relative z-10">
        <FadeIn>
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary-container/30 px-3 py-1 text-sm font-semibold text-on-secondary-container mb-6 border border-secondary-container/50">
              <StarFilledIcon className="h-4 w-4" />
              <span>Healthcare built for trust</span>
            </div>
            
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-text-primary sm:text-6xl mb-6 font-serif">
              Fast, guided online consultations for a healthier <span className="text-primary">Ginhawa</span>.
            </h1>
            
            <p className="max-w-2xl text-lg text-on-surface-variant mb-10 leading-relaxed">
              Not sure which specialist to see? Our guided matching system helps you find the right care based on your symptoms, so you can breathe easier.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="rounded-full" asChild>
                <Link href="/auth/register">
                  Find a Doctor <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full" asChild>
                <Link href="#features">How it works</Link>
              </Button>
            </div>
            
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-text-primary">500+</span>
                <span className="text-sm text-on-surface-variant">Vetted Doctors</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-text-primary">10k+</span>
                <span className="text-sm text-on-surface-variant">Happy Patients</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-text-primary">24/7</span>
                <span className="text-sm text-on-surface-variant">Support</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-text-primary">100%</span>
                <span className="text-sm text-on-surface-variant">Secure</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
