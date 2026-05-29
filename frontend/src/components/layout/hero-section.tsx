import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/ui/fade-in";
import { InlineRecommendationWidget } from "@/components/ui/inline-recommendation-widget";
import { MagicWandIcon } from "@radix-ui/react-icons";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-20 sm:py-24 lg:py-32">
      <div className="absolute inset-0">
        <div className="absolute -top-24 right-[-20%] h-[520px] w-[520px] rounded-full bg-primary-container/15 blur-3xl" />
        <div className="absolute -bottom-24 left-[-18%] h-[520px] w-[520px] rounded-full bg-secondary-container/12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_10%,rgba(72,202,182,0.10),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(49,167,149,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_50%_100%,rgba(49,167,149,0.08),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <div className="h-full pb-12 lg:col-span-7">
            <FadeIn className="flex h-full flex-col justify-between">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="border border-secondary-container/60 bg-secondary-container/25 text-on-secondary-container"
                >
                  <span
                    className="mr-2 inline-flex h-2 w-2 rounded-full bg-success animate-pulse"
                    aria-hidden="true"
                  />
                  AI-Powered Symptom Matching
                </Badge>
                <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-on-surface-variant">
                  <MagicWandIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Free · Private · No referral needed
                </span>
              </div>

              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
                The right doctor for{" "}
                <span className="text-primary">exactly how you&apos;re feeling.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-on-surface-variant">
                Describe your symptoms in plain language. In seconds, we&apos;ll match you with a
                specialist and help you book a secure video call — no referral needed.
              </p>

              <div className="mt-auto pt-8">
                <div>
                  <Link
                    href="/doctors"
                    className="text-sm font-semibold text-on-surface-variant hover:text-primary hover:underline"
                  >
                    Browse doctors
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>

          <div className="flex items-stretch lg:col-span-5">
            <FadeIn direction="left" delay={0.12} className="w-full">
              <InlineRecommendationWidget />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
