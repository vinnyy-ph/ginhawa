import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import {
  CalendarIcon,
  LockClosedIcon,
  MixerHorizontalIcon,
  Pencil2Icon,
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

export function CapabilitiesSection() {
  return (
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
  );
}
