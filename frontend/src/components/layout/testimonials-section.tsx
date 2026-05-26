import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { QuoteIcon } from "@radix-ui/react-icons";

const testimonials = [
  {
    name: "Maria Santos",
    role: "Patient",
    content: "The symptom-based matching is a lifesaver. I didn't know which doctor to see for my recurring headaches, but Ginhawa guided me to the right specialist immediately.",
  },
  {
    name: "Dr. Roberto Reyes",
    role: "Internal Medicine",
    content: "Ginhawa provides a clean and efficient workflow for my practice. I can easily manage my schedule and focus more on my patients' health.",
  },
  {
    name: "Juan Dela Cruz",
    role: "Patient",
    content: "The online consultations are so convenient. I saved hours of travel and waiting time, and the video quality was excellent. Highly recommended!",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-surface">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl mb-4 font-serif">
              Trusted by Patients and Doctors
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-on-surface-variant">
              See what our community has to say about their Ginhawa experience.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <FadeIn key={index} delay={index * 0.1}>
              <Card className="h-full border-none">
                <CardHeader>
                  <QuoteIcon className="h-8 w-8 text-primary/20 mb-4" />
                  <p className="text-on-surface-variant italic mb-6">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold">
                      {testimonial.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{testimonial.name}</p>
                      <p className="text-xs text-on-surface-variant">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
