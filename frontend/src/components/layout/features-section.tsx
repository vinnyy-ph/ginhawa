import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MagnifyingGlassIcon, CalendarIcon, VideoIcon, ClipboardIcon } from "@radix-ui/react-icons";
import { FadeIn } from "@/components/ui/fade-in";

const features = [
  {
    title: "Symptom-Based Matching",
    description: "Describe how you feel, and we'll suggest the most relevant specialists for your concerns.",
    icon: MagnifyingGlassIcon,
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Easy Scheduling",
    description: "Book, reschedule, or cancel appointments with just a few clicks. Real-time availability at your fingertips.",
    icon: CalendarIcon,
    color: "bg-secondary-container/30 text-on-secondary-container",
  },
  {
    title: "Secure Consultations",
    description: "Attend your doctor appointments from the comfort of your home with our integrated video platform.",
    icon: VideoIcon,
    color: "bg-tertiary-container/30 text-on-tertiary-container",
  },
  {
    title: "Health Records",
    description: "Keep track of your medical history, prescriptions, and consultation notes in one secure place.",
    icon: ClipboardIcon,
    color: "bg-info/10 text-info",
  },
];

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
                  <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="h-6 w-6" />
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
