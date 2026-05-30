import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { ChevronRightIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import type { RecommendationLog } from "@/types/api";

interface ResultsStepProps {
  result: RecommendationLog | null;
  onRestart: () => void;
  isAnalyzing: boolean;
  streamingSpecialization: string | null;
  streamingExplanation: string;
}

export function ResultsStep({
  result,
  onRestart,
  isAnalyzing,
  streamingSpecialization,
  streamingExplanation,
}: ResultsStepProps) {
  if (!result && !isAnalyzing) return null;

  if (streamingSpecialization === 'EMERGENCY' || result?.matchedSpecialization === 'EMERGENCY') {
    return (
      <FadeIn>
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-error font-serif italic uppercase tracking-tighter">Emergency Detected</h2>
            <p className="text-on-surface-variant font-medium">Please prioritize your safety immediately.</p>
          </div>

          <Card className="overflow-hidden border-2 border-error shadow-lifted rounded-3xl bg-red-50/50">
            <div className="bg-error p-8 text-center text-white space-y-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2 animate-pulse">
                <ExclamationTriangleIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-4xl font-bold font-serif leading-tight">Seek Emergency Care Immediately</h3>
            </div>
            <div className="p-8 space-y-8">
              <p className="text-on-surface-variant text-lg leading-relaxed text-center font-medium">
                Based on your symptoms, our system indicates a high-risk situation that requires immediate medical intervention.
                <strong> Please do not book a telehealth consultation.</strong>
              </p>

              <div className="space-y-4">
                <Button size="lg" variant="destructive" className="w-full py-8 text-xl rounded-2xl shadow-soft font-bold animate-bounce" asChild>
                  <a href="tel:911">Call 911 Now</a>
                </Button>
                <Button variant="outline" size="lg" className="w-full py-8 text-lg rounded-2xl border-error text-error hover:bg-red-50" onClick={onRestart}>
                  Go back & edit symptoms
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-text-primary font-serif">
            {isAnalyzing ? "Analyzing Symptoms..." : "Your Recommendation"}
          </h2>
          <p className="text-on-surface-variant">
            {isAnalyzing
              ? "Reading your symptoms and evaluating conditions..."
              : "Based on your description, we recommend consulting a specialist."}
          </p>
        </div>

        <Card className="overflow-hidden border border-outline-variant/30 shadow-lifted rounded-3xl">
          <div className="bg-gradient-to-br from-primary to-primary-container p-10 text-center text-white transition-all duration-500 relative">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
            <p className="text-sm uppercase tracking-widest font-bold opacity-90 mb-3 relative z-10">Recommended Specialist</p>
            <h3 className={`text-4xl md:text-5xl font-bold font-serif transition-all duration-500 relative z-10 ${isAnalyzing && !streamingSpecialization ? 'animate-pulse opacity-50' : ''}`}>
              {streamingSpecialization || result?.matchedSpecialization || "Determining..."}
            </h3>
          </div>
          <div className="p-8 md:p-10 bg-surface-white space-y-8">
            <div className="text-on-surface-variant text-base leading-relaxed italic border-l-4 border-primary/40 pl-5 min-h-[4rem]">
              {streamingExplanation || result?.aiExplanation || (isAnalyzing ? "Evaluating..." : "")}
              {isAnalyzing && <span className="inline-block w-1.5 h-4 ml-1 bg-primary/70 animate-pulse align-middle"></span>}
            </div>

            {!isAnalyzing && result && (
              <div className="space-y-4 animate-in fade-in zoom-in duration-500 pt-4">
                <Button asChild size="lg" className="w-full py-8 text-lg rounded-2xl shadow-soft font-semibold">
                  <Link href={`/doctors?specialization=${encodeURIComponent(result.matchedSpecialization)}`}>
                    Find {result.matchedSpecialization}s
                    <ChevronRightIcon className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="w-full py-8 text-lg rounded-2xl font-semibold border-outline-variant/60">
                  <Link href="/doctors">Browse all specialists</Link>
                </Button>
              </div>
            )}

            <div className="pt-6 border-t border-outline-variant/50 flex justify-center">
              <button
                onClick={onRestart}
                className="text-primary font-semibold hover:text-primary/80 transition-colors"
                aria-label="Restart analysis and start a new one"
              >
                Start a new analysis
              </button>
            </div>
          </div>
        </Card>
      </div>
    </FadeIn>
  );
}
