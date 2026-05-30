/**
 * HowItWorksSection — 3-step explainer on the public landing page.
 *
 * Walks prospective users through the core patient journey: describe symptoms,
 * get matched, book a video consultation. Arrow separators between steps are
 * hidden on mobile (horizontal layout) and replaced by vertical flow. Used on
 * the public home page between the features grid and testimonials.
 */
import { ChatBubbleIcon, MagicWandIcon, VideoIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import { FadeIn } from "@/components/ui/fade-in";

const steps = [
  {
    step: 1,
    title: "Describe your symptoms",
    description: "Tell our AI how you feel — free and no account needed.",
    icon: ChatBubbleIcon,
  },
  {
    step: 2,
    title: "Get matched to a specialist",
    description: "Ginhawa points you to the right kind of doctor in seconds.",
    icon: MagicWandIcon,
  },
  {
    step: 3,
    title: "Book a secure video consultation",
    description: "Sign up, pick a doctor, and meet by video from home.",
    icon: VideoIcon,
  },
];

/** Renders the 3-step patient journey with staggered FadeIn and arrow connectors. */
export function HowItWorksSection() {
  return (
    <section className="py-16 bg-surface sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-serif text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              How Ginhawa works
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-on-surface-variant">
              From “what doctor do I need?” to a video visit — in three simple steps.
            </p>
          </div>
        </FadeIn>

        <div className="flex flex-col items-stretch gap-6 md:flex-row md:items-center md:justify-center">
          {steps.map((step, index) => (
            <div key={step.step} className="flex flex-col items-center gap-6 md:flex-row">
              <FadeIn delay={index * 0.1} className="flex-1">
                <div className="flex h-full flex-col items-center rounded-2xl bg-surface-white p-6 text-center shadow-soft">
                  <div className="relative mb-4 h-14 w-14">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <step.icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-text-primary">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{step.description}</p>
                </div>
              </FadeIn>
              {index < steps.length - 1 && (
                <ArrowRightIcon
                  className="hidden h-6 w-6 shrink-0 rotate-90 text-primary/40 md:block md:rotate-0"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
