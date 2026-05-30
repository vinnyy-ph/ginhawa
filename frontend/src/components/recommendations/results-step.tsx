import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { DoctorCard } from "@/components/doctors/doctor-card";
import type { MatchResult } from "@/types/api";

interface ResultsStepProps {
  result: MatchResult | null;
  onRestart: () => void;
  isAnalyzing: boolean;
}

export function ResultsStep({ result, onRestart, isAnalyzing }: ResultsStepProps) {
  if (!result && !isAnalyzing) return null;

  if (isAnalyzing && !result) {
    return (
      <FadeIn>
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-text-primary font-serif">Finding your matches...</h2>
            <p className="text-on-surface-variant">Reading your request and ranking doctors.</p>
          </div>
          <Card className="p-10 shadow-lifted rounded-3xl bg-surface-white">
            <div className="h-32 animate-pulse rounded-2xl bg-surface-container-low" />
          </Card>
        </div>
      </FadeIn>
    );
  }

  if (!result) return null;

  if (result.emergency) {
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
                {result.explanation}{" "}
                <strong>Please do not book a telehealth consultation.</strong>
              </p>
              <div className="space-y-4">
                <Button size="lg" variant="destructive" className="w-full py-8 text-xl rounded-2xl shadow-soft font-bold animate-bounce" asChild>
                  <a href="tel:911">Call 911 Now</a>
                </Button>
                <Button variant="outline" size="lg" className="w-full py-8 text-lg rounded-2xl border-error text-error hover:bg-red-50" onClick={onRestart}>
                  Go back & edit
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </FadeIn>
    );
  }

  const spec = result.criteria.specialization;

  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-text-primary font-serif">Your Matches</h2>
          <p className="text-on-surface-variant">
            Based on your request, ranked by how closely each doctor fits.
          </p>
        </div>

        <Card className="overflow-hidden border border-outline-variant/30 shadow-lifted rounded-3xl">
          <div className="bg-gradient-to-br from-primary to-primary-container p-8 text-center text-white relative">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
            <p className="text-sm uppercase tracking-widest font-bold opacity-90 mb-2 relative z-10">
              {spec ? "Recommended Specialty" : "Recommendation"}
            </p>
            {spec && <h3 className="text-3xl md:text-4xl font-bold font-serif relative z-10">{spec}</h3>}
          </div>
          <div className="p-8 bg-surface-white">
            <p className="text-on-surface-variant text-base leading-relaxed italic border-l-4 border-primary/40 pl-5">
              {result.explanation}
            </p>
          </div>
        </Card>

        {result.doctors.length === 0 ? (
          <Card className="p-10 text-center space-y-4 rounded-3xl border border-outline-variant/30">
            <p className="text-on-surface-variant font-medium">No matching doctors yet.</p>
            <Button variant="outline" size="lg" asChild className="rounded-2xl">
              <Link href="/doctors">Browse all specialists</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-5">
            {result.doctors.map((doctor) => (
              <div key={doctor.id} className="space-y-2">
                <DoctorCard doctor={doctor} isPatient={true} />
                {doctor.matchReason && (
                  <div className="flex items-center gap-2 px-2">
                    <span className="inline-flex items-center rounded-full bg-secondary-container/40 px-3 py-1 text-xs font-semibold text-on-secondary-container">
                      Why this match: {doctor.matchReason}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Button variant="outline" size="lg" asChild className="rounded-2xl font-semibold border-outline-variant/60">
            <Link href="/doctors">Browse all specialists</Link>
          </Button>
          <button
            onClick={onRestart}
            className="text-primary font-semibold hover:text-primary/80 transition-colors"
            aria-label="Start a new search"
          >
            Start a new search
          </button>
        </div>
      </div>
    </FadeIn>
  );
}
