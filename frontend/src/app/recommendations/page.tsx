"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { 
  ActivityLogIcon, 
  ExclamationTriangleIcon,
  ChevronRightIcon,
  InfoCircledIcon,
  ChatBubbleIcon
} from "@radix-ui/react-icons";
import type { RecommendationLog } from "@/types/api";
import { parse } from 'partial-json';

function RecommendationsContent() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const [history, setHistory] = useState<RecommendationLog[]>([]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState<RecommendationLog | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingSpecialization, setStreamingSpecialization] = useState<string | null>(null);
  const [streamingExplanation, setStreamingExplanation] = useState<string>("");

  const { isRecording, isProcessing, isSupported, error: micError, startRecording, stopRecording } = useSpeechRecognition();

  const searchParams = useSearchParams();

  useEffect(() => {
    const prefilledSymptoms = searchParams.get("symptoms");
    if (prefilledSymptoms) {
      queueMicrotask(() => {
        setSymptoms(prefilledSymptoms);
        setStep(2);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only: pre-fill once from URL, don't reset if URL changes later
  }, []);

  useEffect(() => {
    if (!token) return;
    apiRequest<RecommendationLog[]>("/recommendations", { token })
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [token]);

  const handleTranscript = (text: string) => {
    setSymptoms((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  };

  const handleAnalyze = async () => {
    if (symptoms.trim().length < 10) return;

    setIsAnalyzing(true);
    setError(null);
    setStep(3);
    setResult(null);
    setStreamingSpecialization(null);
    setStreamingExplanation("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptomInput: symptoms }),
      });

      if (!response.ok) throw new Error("Failed to analyze symptoms.");
      if (!response.body) throw new Error("No response body.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkValue = decoder.decode(value, { stream: true });
          if (chunkValue.includes('{"error":')) {
            throw new Error("Stream failed midway");
          }
          fullText += chunkValue;
          
          try {
            const parsed = parse(fullText);
            if (typeof parsed === 'object' && parsed !== null) {
              if (parsed.explanation) setStreamingExplanation(parsed.explanation);
              if (parsed.specialization) setStreamingSpecialization(parsed.specialization);
            }
          } catch {
            // ignore
          }
        }
      }

      const finalParsed = parse(fullText) as { explanation?: string; specialization?: string };
      if (!finalParsed.specialization || !finalParsed.explanation) {
        throw new Error("Received incomplete data from the server.");
      }
      const completeLog = { id: 'temp-' + Date.now(), symptomInput: symptoms, createdAt: new Date().toISOString(), aiExplanation: finalParsed.explanation, matchedSpecialization: finalParsed.specialization } as RecommendationLog;
      setResult(completeLog);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRestart = () => {
    setStep(1);
    setSymptoms("");
    setResult(null);
    setError(null);
    setStreamingSpecialization(null);
    setStreamingExplanation("");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main id="main-content" className="flex-grow relative bg-surface pb-24 pt-16 overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-[-10%] h-[500px] w-[500px] rounded-full bg-primary-container/20 blur-3xl" />
          <div className="absolute top-[40%] left-[-10%] h-[400px] w-[400px] rounded-full bg-secondary-container/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_50%_0%,rgba(72,202,182,0.08),transparent_70%)]" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-4 space-y-10">
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
              isRecording={isRecording}
              isProcessing={isProcessing}
              isSupported={isSupported}
              micError={micError}
              onMicClick={() =>
                isRecording ? stopRecording(handleTranscript) : startRecording()
              }
            />
          )}
          {step === 3 && (
            <ResultsStep
              result={result}
              onRestart={handleRestart}
              isAnalyzing={isAnalyzing}
              streamingSpecialization={streamingSpecialization}
              streamingExplanation={streamingExplanation}
            />
          )}

          {token && history.length > 0 && (
            <div className="pt-8 border-t border-outline-variant/30">
              <h2 className="font-serif text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                <ActivityLogIcon className="w-5 h-5 text-primary" />
                Your past symptom checks
              </h2>
              <div className="space-y-4">
                {history.map((item) => (
                  <Card
                    key={item.id}
                    className="p-5 bg-surface-white border border-outline-variant/30 rounded-2xl shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface-variant line-clamp-2 italic mb-1">
                          &ldquo;{item.symptomInput}&rdquo;
                        </p>
                        {item.aiExplanation && (
                          <p className="text-xs text-on-surface-variant line-clamp-1 italic opacity-70">
                            {item.aiExplanation}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm font-semibold">
                          {item.matchedSpecialization}
                        </span>
                        <Link
                          href="/doctors"
                          className="text-primary hover:text-primary/80 transition-colors"
                          aria-label={`Find doctors for ${item.matchedSpecialization}`}
                        >
                          <ChevronRightIcon className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      <div className="sr-only" aria-live="polite" role="status">
        {isAnalyzing && "Analyzing your symptoms, please wait..."}
        {error && `Error: ${error}`}
      </div>
    </div>
  );
}

function WelcomeStep({ onStart }: { onStart: () => void }) {
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

interface SymptomsStepProps {
  symptoms: string;
  setSymptoms: (value: string) => void;
  onBack: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  error: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  micError: string | null;
  onMicClick: () => void;
}

function SymptomsStep({
  symptoms,
  setSymptoms,
  onBack,
  onAnalyze,
  isAnalyzing,
  error,
  isRecording,
  isProcessing,
  isSupported,
  micError,
  onMicClick,
}: SymptomsStepProps) {
  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-text-primary font-serif">Tell us what&apos;s happening</h2>
          <p className="text-on-surface-variant">
            Take your time and describe what&apos;s bothering you. You can type or use your voice.
          </p>
        </div>

        <Card className="p-8 shadow-lifted border-none rounded-3xl bg-surface-white">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <label htmlFor="symptoms" className="block text-sm font-semibold text-text-primary uppercase tracking-wide">
                Your Symptoms
              </label>
              {isSupported && (
                <button
                  type="button"
                  onClick={onMicClick}
                  disabled={isProcessing}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all ${
                    isRecording
                      ? "bg-error text-white shadow-md animate-pulse"
                      : isProcessing
                      ? "bg-surface-variant text-on-surface-variant opacity-70 cursor-not-allowed"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? (
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h-3v2h8v-2h-3v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
                    </svg>
                  )}
                  {isProcessing ? "Transcribing..." : isRecording ? "Listening..." : "Use Voice"}
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                id="symptoms"
                autoFocus
                className="w-full min-h-[200px] p-5 rounded-2xl border-2 border-outline-variant/40 focus:ring-0 focus:border-primary bg-surface-container-lowest text-on-surface transition-all outline-none text-lg resize-y shadow-inner"
                placeholder="e.g., I've had a persistent headache for 3 days, accompanied by nausea..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "symptoms-error" : undefined}
              />
            </div>
            {micError && <div className="text-error text-sm mt-2 font-medium" role="alert">{micError}</div>}
            {error && (
              <p id="symptoms-error" className="text-sm text-error font-medium flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {error}
              </p>
            )}
            <div className="flex justify-between items-center text-xs font-medium text-on-surface-variant px-1">
              <span>{symptoms.length < 10 ? "Please enter at least 10 characters" : "Looks detailed enough!"}</span>
              <span>{symptoms.length} characters</span>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Button variant="outline" className="flex-1 py-7 rounded-2xl text-base font-semibold border-outline-variant/60 hover:bg-surface-container-low transition-colors" onClick={onBack}>
              Back
            </Button>
            <Button
              className="flex-[2] py-7 shadow-lifted rounded-2xl text-base font-semibold"
              disabled={symptoms.trim().length < 10 || isAnalyzing}
              onClick={onAnalyze}
            >
              {isAnalyzing ? "Analyzing..." : "Find My Specialist"}
            </Button>
          </div>
        </Card>
      </div>
    </FadeIn>
  );
}

function ResultsStep({ 
  result, 
  onRestart,
  isAnalyzing,
  streamingSpecialization,
  streamingExplanation
}: { 
  result: RecommendationLog | null; 
  onRestart: () => void;
  isAnalyzing: boolean;
  streamingSpecialization: string | null;
  streamingExplanation: string;
}) {
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

export default function RecommendationsPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <RecommendationsContent />
    </React.Suspense>
  );
}
