/**
 * FeaturesSection — four-feature grid on the public landing page.
 *
 * Highlights the platform's core capabilities (Symptom Matching, Scheduling,
 * Consultations, Health Records) as numbered icon cards. Used on the public
 * home page between the hero and the how-it-works section.
 */
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MagnifyingGlassIcon, CalendarIcon, VideoIcon, ClipboardIcon } from "@radix-ui/react-icons";
import { FadeIn } from "@/components/ui/fade-in";

const features = [
  {
    step: 1,
    title: "Symptom-Based Matching",
    description: "Describe how you feel, and our AI suggests the right specialist. No account needed.",
    icon: MagnifyingGlassIcon,
    color: "bg-primary/10 text-primary",
  },
  {
    step: 2,
    title: "Easy Scheduling",
    description: "Book, reschedule, or cancel appointments with just a few clicks. Real-time availability at your fingertips.",
    icon: CalendarIcon,
    color: "bg-secondary-container/30 text-on-secondary-container",
  },
  {
    step: 3,
    title: "Secure Consultations",
    description: "Attend your doctor appointments from the comfort of your home with our integrated video platform.",
    icon: VideoIcon,
    color: "bg-tertiary-container/30 text-on-tertiary-container",
  },
  {
    step: 4,
    title: "Health Records",
    description: "Keep track of your medical history, prescriptions, and consultation notes in one secure place.",
    icon: ClipboardIcon,
    color: "bg-info/10 text-info",
  },
];

/** Renders a 4-column grid of feature cards with stepped fade-in animations. */
export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-surface">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl mb-4 font-serif">
              Healthcare designed for your peace of mind
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-on-surface-variant">
              Ginhawa simplifies every step of your medical journey, from discovery to follow-up care.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <FadeIn key={index} delay={index * 0.1}>
              <Card className="border-none h-full hover:-translate-y-1 transition-transform duration-300">
                <CardHeader>
                  <div className="relative w-12 h-12 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                      {feature.step}
                    </span>
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
