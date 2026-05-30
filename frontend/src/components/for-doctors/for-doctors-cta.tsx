import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/ui/fade-in';

export function ForDoctorsCta() {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-outline-variant bg-surface-white p-8 shadow-soft sm:p-10">
            <div
              className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_0%,rgba(72,202,182,0.12),transparent_55%),radial-gradient(700px_circle_at_90%_40%,rgba(49,167,149,0.10),transparent_55%)]"
              aria-hidden="true"
            />

            <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8">
                <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
                  Bring more <span className="text-primary">Ginhawa</span> into your practice.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                  Create a doctor account to explore the workflow. If you’d like a guided demo for your clinic, reach us anytime.
                </p>
              </div>
              <div className="lg:col-span-4 lg:flex lg:justify-end">
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
                  <Button size="lg" className="rounded-full" asChild>
                    <Link href="/signup/doctor">Join as a Doctor</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full" asChild>
                    <Link href="mailto:hello@ginhawa.health">Request a demo</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
