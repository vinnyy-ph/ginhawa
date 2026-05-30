/**
 * FAQSection — frequently asked questions accordion for the public landing page.
 *
 * Renders a centred single-column accordion covering platform basics (symptom
 * matching, data security, joining consultations, scheduling, and post-visit
 * records). Used on the public home page (/) between the features grid and CTA.
 */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FadeIn } from "@/components/ui/fade-in";

const faqs = [
  {
    question: "How does the symptom-based matching work?",
    answer: "Our system uses keyword analysis and healthcare logic to map your described symptoms to the most relevant medical specializations. This ensures you see the right doctor for your specific needs without having to guess.",
  },
  {
    question: "Is my medical data secure?",
    answer: "Absolutely. We prioritize your privacy and use industry-standard encryption to protect your personal and medical information. Only authorized doctors involved in your care can access your records.",
  },
  {
    question: "How do I join my online consultation?",
    answer: "Once your appointment is confirmed, you'll see a 'Join Session' button in your dashboard. At the scheduled time, simply click the button to enter the secure video consultation room.",
  },
  {
    question: "Can I reschedule or cancel my appointment?",
    answer: "Yes, you can manage all your bookings through your patient dashboard. We recommend rescheduling or cancelling at least 24 hours in advance to allow other patients to use the time slot.",
  },
  {
    question: "What happens after my consultation?",
    answer: "After the session, your doctor will provide consultation notes and prescriptions if necessary. You can view these anytime in your medical records section within the Ginhawa app.",
  },
];

/** Renders a staggered-fade accordion of the most common patient/doctor questions. */
export function FAQSection() {
  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl mb-4 font-serif">
              Frequently Asked Questions
            </h2>
            <p className="text-on-surface-variant">
              Everything you need to know about using the Ginhawa platform.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </div>
    </section>
  );
}
