import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/ui/fade-in";
import { InlineRecommendationWidget } from "@/components/ui/inline-recommendation-widget";
import { ActivityLogIcon, CheckCircledIcon } from "@radix-ui/react-icons";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-16 sm:py-20 lg:py-28">
      <div className="absolute inset-0">
        <div className="absolute -top-24 right-[-20%] h-[520px] w-[520px] rounded-full bg-primary-container/15 blur-3xl" />
        <div className="absolute -bottom-24 left-[-18%] h-[520px] w-[520px] rounded-full bg-secondary-container/12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_10%,rgba(72,202,182,0.10),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(49,167,149,0.12),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <FadeIn>
              <div className="mb-5 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="border border-secondary-container/60 bg-secondary-container/25 text-on-secondary-container"
                >
                  <ActivityLogIcon className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  AI-Powered Symptom Matching
                </Badge>
              </div>

              <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
                Not sure which doctor to see?{" "}
                <span className="text-primary">Describe your symptoms.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-on-surface-variant">
                Ginhawa&apos;s AI reads what you&apos;re feeling and tells you exactly which
                specialist to visit — free, no account needed.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-2">
                  <CheckCircledIcon className="h-4 w-4 text-success" aria-hidden="true" />
                  Free to use
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircledIcon className="h-4 w-4 text-success" aria-hidden="true" />
                  No account needed
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircledIcon className="h-4 w-4 text-success" aria-hidden="true" />
                  Results in seconds
                </span>
              </div>

              <p className="mt-6 text-sm text-on-surface-variant">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Log in
                </Link>
                {" · "}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                  Sign up free
                </Link>
              </p>
            </FadeIn>
          </div>

          <div className="lg:col-span-5">
            <FadeIn direction="left" delay={0.12}>
              <InlineRecommendationWidget />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
