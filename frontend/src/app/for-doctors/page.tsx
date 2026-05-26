import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import {
  CalendarIcon,
  CheckCircledIcon,
  LightningBoltIcon,
  LockClosedIcon,
  MixerHorizontalIcon,
  Pencil2Icon,
  MagicWandIcon,
} from '@radix-ui/react-icons';

const capabilityCards = [
  {
    icon: CalendarIcon,
    title: 'Schedule that stays sane',
    description:
      'Set availability in minutes, reduce back‑and‑forth, and keep your day predictable — even when appointments shift.',
  },
  {
    icon: MixerHorizontalIcon,
    title: 'Patient context, ready',
    description:
      'Review symptoms and basic history before the call so you can spend less time triaging and more time caring.',
  },
  {
    icon: Pencil2Icon,
    title: 'Notes & prescriptions, streamlined',
    description:
      'Capture key details immediately after the consult with a workflow designed for clarity, not clerical burden.',
  },
  {
    icon: LockClosedIcon,
    title: 'Privacy-first by default',
    description:
      'Role-based access and secure handling of patient data so your practice earns trust with every interaction.',
  },
] as const;

const workflowSteps = [
  {
    eyebrow: '01',
    title: 'Create your doctor profile',
    description:
      'Add your specialization, a short bio, and your clinic rhythm — patients see what matters at a glance.',
  },
  {
    eyebrow: '02',
    title: 'Set availability once',
    description:
      'Define consult blocks that match your real day. Ginhawa keeps booking tidy within those boundaries.',
  },
  {
    eyebrow: '03',
    title: 'Consult with confidence',
    description:
      'Join sessions with patient context already surfaced — the conversation stays human and focused.',
  },
  {
    eyebrow: '04',
    title: 'Document fast, follow up cleanly',
    description:
      'Write notes and prescriptions right after. Patients can review them anytime in their records.',
  },
] as const;

export const metadata = {
  title: 'Ginhawa for Doctors — Calm workflows for clinical care',
  description:
    'A doctor-first telehealth workflow for schedules, patient context, and post-consult documentation — built for trust in the Philippines.',
};

export default function ForDoctorsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* HERO */}
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

        {/* CAPABILITIES */}
        <section className="py-20">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="mb-10 flex items-end justify-between gap-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">For doctors</p>
                  <h2 className="mt-2 text-3xl font-bold text-text-primary sm:text-4xl">
                    Everything you need — nothing you don’t.
                  </h2>
                </div>
                <p className="hidden max-w-md text-sm text-on-surface-variant md:block">
                  Focus on the consult. Let the platform handle the predictable parts: scheduling boundaries, context surfacing, and clean documentation.
                </p>
              </div>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {capabilityCards.map((card) => {
                const Icon = card.icon;
                return (
                  <FadeIn key={card.title} delay={0.05}>
                    <Card className="h-full rounded-2xl border border-outline-variant/80 bg-surface-white">
                      <CardContent className="p-6">
                        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface-white">
                          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <h3 className="text-base font-bold text-text-primary">{card.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{card.description}</p>
                      </CardContent>
                    </Card>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section
          id="workflow"
          className="relative overflow-hidden border-y border-outline-variant bg-surface py-20"
        >
          <div
            className="absolute inset-0 bg-[linear-gradient(115deg,rgba(72,202,182,0.10),transparent_35%,rgba(49,167,149,0.06))]"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="grid gap-10 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Workflow</p>
                  <h2 className="mt-2 text-3xl font-bold text-text-primary sm:text-4xl">
                    From profile to post‑consult — in a clean line.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-on-surface-variant">
                    The MVP is built to feel safe and healthcare‑appropriate: clear, predictable, and respectful of the reality of clinic time.
                  </p>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Button variant="outline" className="rounded-full" asChild>
                      <Link href="/login">Doctor login</Link>
                    </Button>
                    <Button className="rounded-full" asChild>
                      <Link href="/signup/doctor">Create doctor account</Link>
                    </Button>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {workflowSteps.map((step) => (
                      <Card
                        key={step.eyebrow}
                        className="rounded-2xl border border-outline-variant/80 bg-surface-white"
                      >
                        <CardContent className="p-6">
                          <p className="text-xs font-bold tracking-widest text-primary">{step.eyebrow}</p>
                          <h3 className="mt-2 text-base font-bold text-text-primary">{step.title}</h3>
                          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{step.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* FOOTER CTA */}
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
      </main>

      <Footer />
    </div>
  );
}
