import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import {
  CalendarIcon,
  CheckCircledIcon,
  LightningBoltIcon,
  MagicWandIcon,
} from '@radix-ui/react-icons';

export function ForDoctorsHero() {
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
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="border border-secondary-container/60 bg-secondary-container/25 text-on-secondary-container"
                >
                  <span
                    className="mr-2 inline-flex h-2 w-2 rounded-full bg-success animate-pulse"
                    aria-hidden="true"
                  />
                  Built for clinical clarity
                </Badge>
                <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-on-surface-variant">
                  <MagicWandIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Modern Corporate, tactile calm
                </span>
              </div>

              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
                The doctor workflow that feels like{' '}
                <span className="text-primary">breathing room</span>.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-on-surface-variant">
                Ginhawa helps you manage availability, review patient context, and document consults with less friction — so your time stays where it belongs: with patients.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" className="rounded-full" asChild>
                  <Link href="/signup/doctor">
                    Join as a Doctor
                    <LightningBoltIcon className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full" asChild>
                  <Link href="#workflow">See how it works</Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-2">
                  <CheckCircledIcon className="h-4 w-4 text-success" aria-hidden="true" />
                  Schedule management
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircledIcon className="h-4 w-4 text-success" aria-hidden="true" />
                  Patient context review
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircledIcon className="h-4 w-4 text-success" aria-hidden="true" />
                  Notes & prescriptions
                </span>
              </div>
            </FadeIn>
          </div>

          <div className="lg:col-span-5">
            <FadeIn direction="left" delay={0.12}>
              <Card className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-white shadow-lifted">
                <div
                  className="absolute inset-0 bg-[radial-gradient(600px_circle_at_60%_20%,rgba(72,202,182,0.18),transparent_55%)]"
                  aria-hidden="true"
                />
                <CardHeader className="relative pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-secondary-container/40 bg-secondary-container/25">
                        <CalendarIcon className="h-5 w-5 text-on-secondary-container" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-on-surface-variant">Today</p>
                        <CardTitle className="text-xl">Clinic Day Snapshot</CardTitle>
                      </div>
                    </div>
                    <Badge variant="success" className="bg-success/90">
                      On time
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-outline-variant/70 bg-surface-white px-4 py-3 shadow-soft"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">Consultation • 30 mins</p>
                          <p className="text-xs text-on-surface-variant">Symptoms summary ready • Notes template loaded</p>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-info animate-pulse" aria-hidden="true" />
                          <span className="text-xs font-semibold text-on-surface-variant">Live</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-xl bg-primary/5 p-4">
                    <p className="text-sm font-semibold text-text-primary">Designed for long shifts</p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Soft surfaces, clear hierarchy, and calm motion — so your eyes and attention don’t burn out.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
