/**
 * ShowcaseSection — design/UI pitch section on the public landing page.
 *
 * Two-column layout: left column lists design principles (mobile-responsive,
 * high contrast, guided workflows, real-time updates); right column renders
 * a CSS-only app mockup using surface tokens and placeholder shapes — no real
 * screenshots required. Used on the public home page between the how-it-works
 * section and testimonials.
 */
import { FadeIn } from "@/components/ui/fade-in";
import { Logo } from "@/components/ui/logo";

/** Renders the UX pitch with a bullet list and a CSS-only app mockup preview. */
export function ShowcaseSection() {
  return (
    <section className="py-20 bg-background overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <FadeIn direction="right">
              <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl mb-6 font-serif">
                A clean, intuitive interface for stress-free healthcare
              </h2>
              <p className="text-lg text-on-surface-variant mb-8 leading-relaxed">
                We&apos;ve designed Ginhawa to be as simple as breathing. Our interface reduces decision fatigue and prioritizes the most important information for both patients and doctors.
              </p>
              <ul className="space-y-4">
                {[
                  "Mobile-responsive design for on-the-go care",
                  "Clear, high-contrast typography for legibility",
                  "Guided workflows that minimize medical jargon",
                  "Real-time updates and instant notifications"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-on-surface">
                    <div className="h-5 w-5 rounded-full bg-success/20 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-success" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>
          <div className="flex-1 relative">
            <FadeIn direction="left" delay={0.2}>
              <div className="relative z-10 rounded-2xl border-8 border-surface-container-highest shadow-lifted overflow-hidden bg-white aspect-video md:aspect-auto">
                {/* Mockup representation */}
                <div className="bg-surface h-full w-full p-4 md:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <Logo size={24} />
                      <div className="h-4 w-20 bg-primary/20 rounded-full" />
                    </div>
                    <div className="h-8 w-8 rounded-full bg-surface-container-high" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="col-span-2 space-y-3">
                      <div className="h-8 w-full bg-primary/10 rounded-lg" />
                      <div className="h-4 w-3/4 bg-surface-container-high rounded-full" />
                      <div className="h-4 w-1/2 bg-surface-container-high rounded-full" />
                    </div>
                    <div className="h-24 w-full bg-secondary-container/20 rounded-xl" />
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-white shadow-soft">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-surface-container-low" />
                          <div className="space-y-2">
                            <div className="h-3 w-24 bg-surface-container-high rounded-full" />
                            <div className="h-2 w-16 bg-surface-container-low rounded-full" />
                          </div>
                        </div>
                        <div className="h-6 w-16 bg-primary/10 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 h-24 w-24 bg-secondary-container/30 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-primary-container/20 rounded-full blur-3xl" />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
