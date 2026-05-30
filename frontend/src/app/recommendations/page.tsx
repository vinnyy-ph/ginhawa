"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { apiRequest } from "@/lib/api-client";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FadeIn } from "@/components/ui/fade-in";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { WelcomeStep } from "@/components/recommendations/welcome-step";
import { SymptomsStep } from "@/components/recommendations/symptoms-step";
import { ResultsStep } from "@/components/recommendations/results-step";
import { HistoryList } from "@/components/recommendations/history-list";
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

  const loadHistory = useCallback(() => {
    if (!token) return;
    apiRequest<RecommendationLog[]>("/recommendations", { token })
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
      if (token) loadHistory();
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

          {token && history.length > 0 && <HistoryList history={history} />}
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

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecommendationsContent />
    </Suspense>
  );
}
