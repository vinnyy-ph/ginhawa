import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { ChatBubbleIcon, InfoCircledIcon } from "@radix-ui/react-icons";

export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <FadeIn>
      <div className="space-y-10 text-center mt-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-container/80 to-primary/20 flex items-center justify-center mx-auto shadow-sm border border-primary/10">
          <ChatBubbleIcon className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary font-serif tracking-tight">How can we help?</h1>
          <p className="text-on-surface-variant text-lg max-w-md mx-auto leading-relaxed">
            Tell us how you&apos;re feeling, and Ginhawa will guide you to the right specialist for your care.
          </p>
        </div>

        <Card className="p-5 bg-surface-white border border-outline-variant/40 text-left max-w-lg mx-auto rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex gap-4">
            <InfoCircledIcon className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h3 className="font-semibold text-text-primary">Medical Disclaimer</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                This tool provides guidance on finding the right specialist based on your symptoms. It is <strong>not</strong> a medical diagnosis.
                For emergencies, please call 911 immediately.
              </p>
            </div>
          </div>
        </Card>

        <Button size="lg" className="px-12 py-7 text-lg rounded-full shadow-lifted hover:-translate-y-0.5 transition-transform" onClick={onStart}>
          Start Symptom Check
        </Button>
      </div>
    </FadeIn>
  );
}
