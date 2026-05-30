/**
 * WorkflowSection — numbered four-step workflow explainer on the /for-doctors marketing page.
 *
 * Renders a two-column layout: left side has the section heading and doctor login/signup
 * CTAs; right side shows a 2-column grid of the four workflow steps (profile → availability
 * → consult → document). Anchored with `id="workflow"` for the "See how it works" link
 * in ForDoctorsHero to scroll-jump to.
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';

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

export function WorkflowSection() {
  return (
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
  );
}
