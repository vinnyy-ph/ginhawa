import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";

export function CTASection() {
  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 -skew-y-3 origin-right scale-110" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-5xl mb-6 font-serif">
            Ready to find the right care?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-on-surface-variant mb-10">
            Answer a few questions about your symptoms and <span className="text-primary font-bold">Ginhawa</span> will match you to the right specialist — free, no account needed.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="rounded-full px-10" asChild>
              <Link href="/recommendations">Check My Symptoms →</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-10" asChild>
              <Link href="/doctors">Browse all doctors →</Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
