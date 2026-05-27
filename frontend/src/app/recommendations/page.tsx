"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { 
  ActivityLogIcon, 
  ExclamationTriangleIcon,
  ChevronRightIcon 
} from "@radix-ui/react-icons";
import type { RecommendationLog } from "@/types/api";
import { apiRequest } from "@/lib/api-client";

export default function RecommendationsPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState<RecommendationLog | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (symptoms.trim().length < 10) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await apiRequest<RecommendationLog>("/recommendations", {
        method: "POST",
        body: { symptomInput: symptoms },
      });
      setResult(response);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRestart = () => {
    setStep(1);
    setSymptoms("");
    setResult(null);
    setError(null);
  };

  return (
    <>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:p-4 focus:rounded-lg focus:shadow-lg focus:text-primary focus:font-bold"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="min-h-screen bg-surface pb-20 pt-12">
        <div className="max-w-2xl mx-auto px-4 space-y-8">
          <FadeIn>
            <ProgressIndicator currentStep={step} totalSteps={3} />
          </FadeIn>
          
          {step === 1 && <WelcomeStep onStart={() => setStep(2)} />}
          {step === 2 && (
            <SymptomsStep
              symptoms={symptoms}
              setSymptoms={setSymptoms}
              onBack={() => setStep(1)}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              error={error}
            />
          )}
          {step === 3 && <ResultsStep result={result} onRestart={handleRestart} />}
        </div>
      </main>

      <div className="sr-only" aria-live="polite" role="status">
        {isAnalyzing && "Analyzing your symptoms, please wait..."}
        {error && `Error: ${error}`}
      </div>
    </>
  );
}

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <FadeIn>
      <div className="space-y-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-info to-primary flex items-center justify-center mx-auto shadow-soft">
          <ActivityLogIcon className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-text-primary font-serif">Find the Right Care</h1>
          <p className="text-on-surface-variant text-lg max-w-lg mx-auto">
            Ginhawa helps you understand which specialist you should visit based on your symptoms.
          </p>
        </div>
        
        <Card className="p-6 bg-surface-container-low border-info/20 text-left max-w-lg mx-auto rounded-xl">
          <div className="flex gap-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-error shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-bold text-text-primary">Medical Disclaimer</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                This AI tool provides general guidance on specialist matching. It is <strong>not</strong> a medical diagnosis. 
                If you are experiencing a medical emergency, please call 911 or your local emergency services immediately.
              </p>
            </div>
          </div>
        </Card>

        <Button size="lg" className="px-12 py-8 text-lg rounded-full shadow-lifted" onClick={onStart}>
          Start Analysis
        </Button>
      </div>
    </FadeIn>
  );
}

function SymptomsStep({ 
  symptoms, 
  setSymptoms, 
  onBack, 
  onAnalyze,
  isAnalyzing,
  error
}: { 
  symptoms: string; 
  setSymptoms: (val: string) => void; 
  onBack: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  error: string | null;
}) {
  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-text-primary font-serif">Tell us what's happening.</h2>
          <p className="text-on-surface-variant">
            Describe your symptoms in your own words. The more detail you provide, the better we can help.
          </p>
        </div>

        <Card className="p-8 shadow-soft border-outline-variant/30 rounded-xl">
          <div className="space-y-4">
            <label htmlFor="symptoms" className="block text-sm font-bold text-text-primary">
              Your Symptoms
            </label>
            <textarea
              id="symptoms"
              autoFocus
              className="w-full min-h-[160px] p-4 rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary bg-surface-container-lowest text-on-surface transition-all outline-none"
              placeholder="e.g., I've had a persistent headache for 3 days, accompanied by nausea..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "symptoms-error" : undefined}
            />
            {error && (
              <p id="symptoms-error" className="text-sm text-error font-medium flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {error}
              </p>
            )}
            <div className="flex justify-between items-center text-xs text-on-surface-variant">
              <span>{symptoms.length < 10 ? "Minimum 10 characters" : "Looking good!"}</span>
              <span>{symptoms.length} characters</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button variant="outline" className="flex-1 py-6 rounded-xl" onClick={onBack}>
              Back
            </Button>
            <Button 
              className="flex-1 py-6 shadow-soft rounded-xl" 
              disabled={symptoms.trim().length < 10 || isAnalyzing}
              onClick={onAnalyze}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Symptoms"}
            </Button>
          </div>
        </Card>
      </div>
    </FadeIn>
  );
}

function ResultsStep({ result, onRestart }: { result: RecommendationLog | null; onRestart: () => void }) {
  if (!result) return null;

  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-text-primary font-serif">Your Recommendation</h2>
          <p className="text-on-surface-variant">Based on your description, we recommend consulting a specialist.</p>
        </div>

        <Card className="overflow-hidden border-none shadow-lifted rounded-xl">
          <div className="bg-gradient-to-br from-primary to-primary-container p-8 text-center text-white">
            <p className="text-sm uppercase tracking-widest font-bold opacity-80 mb-2">Recommended Specialist</p>
            <h3 className="text-4xl md:text-5xl font-bold font-serif">{result.matchedSpecialization}</h3>
          </div>
          <div className="p-8 bg-white space-y-6">
            <div className="space-y-4">
              <Button asChild size="lg" className="w-full py-8 text-lg rounded-xl shadow-soft">
                <Link href={`/doctors?specialization=${encodeURIComponent(result.matchedSpecialization)}`}>
                  Find {result.matchedSpecialization}s
                  <ChevronRightIcon className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full py-8 text-lg rounded-xl">
                <Link href="/doctors">Browse all specialists</Link>
              </Button>
            </div>
            
            <div className="pt-6 border-t border-outline-variant flex justify-center">
              <button 
                onClick={onRestart}
                className="text-primary font-bold hover:underline"
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
