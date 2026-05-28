"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ActivityLogIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@radix-ui/react-icons";
import type { RecommendationLog } from "@/types/api";
import { parse } from 'partial-json';
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

export default function DashboardAIRecommendationsPage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [symptoms, setSymptoms] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RecommendationLog | null>(null);
  const [history, setHistory] = useState<RecommendationLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingSpecialization, setStreamingSpecialization] = useState<string | null>(null);
  const [streamingExplanation, setStreamingExplanation] = useState<string>("");

  const { isRecording, isProcessing, isSupported, error: micError, startRecording, stopRecording } = useSpeechRecognition();

  const handleTranscript = (text: string) => {
    setSymptoms((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  };

  useEffect(() => {
    async function fetchHistory() {
      if (!token) return;
      try {
        setLoadingHistory(true);
        const data = await apiRequest<RecommendationLog[]>("/recommendations", { token });
        // Sort newest first
        data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setHistory(data);
      } catch {
        console.error("Failed to load recommendation history");
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchHistory();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || symptoms.trim().length < 10) return;

    try {
      setIsSubmitting(true);
      setError(null);
      setResult(null);
      setStreamingSpecialization(null);
      setStreamingExplanation("");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/recommendations`, {
        method: "POST",
        headers,
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
            // parse partial json safely
            const parsed = parse(fullText);
            if (typeof parsed === 'object' && parsed !== null) {
              if (parsed.explanation) setStreamingExplanation(parsed.explanation);
              if (parsed.specialization) setStreamingSpecialization(parsed.specialization);
            }
          } catch {
            // ignore parse errors for incomplete JSON
          }
        }
      }

      const finalParsed = parse(fullText) as { explanation?: string; specialization?: string };
      // We mock the DB generated fields for the immediate UI, the real one is saved in the backend
      const completeLog = { ...finalParsed, id: 'temp-' + Date.now(), symptomInput: symptoms, createdAt: new Date().toISOString(), aiExplanation: finalParsed.explanation, matchedSpecialization: finalParsed.specialization };
      
      setResult(completeLog as RecommendationLog);
      setHistory((prev) => [completeLog as RecommendationLog, ...prev]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyze symptoms. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardLayout role="patient">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">

        {/* Page Heading */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#48cab6] to-[#31a795] flex items-center justify-center mx-auto shadow-soft">
            <ActivityLogIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-text-primary">
            AI Symptom Analyzer
          </h1>
          <p className="text-on-surface-variant font-sans max-w-lg mx-auto">
            Not sure which doctor to see? Describe what you&apos;re feeling, and
            our AI will recommend the most appropriate specialist for your
            condition.
          </p>
        </div>

        {/* Disclaimer Banner */}
        <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-xl px-4 py-3 flex gap-3 items-start text-sm text-[#b45309]">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            <strong className="font-bold">Disclaimer:</strong> This tool uses AI
            to suggest medical specializations based on your symptoms. It is{" "}
            <strong>not</strong> a medical diagnosis. Always consult a licensed
            physician.
          </p>
        </div>

        {/* Icon + Helper Text Row */}
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <ActivityLogIcon className="w-4 h-4 shrink-0 text-primary" />
          <span>
            Your symptom analysis is private and only visible to you.
          </span>
        </div>

        {/* Form */}
        <div className="bg-surface-white rounded-xl shadow-soft p-6 md:p-8 border border-outline-variant/30">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="dashboard-symptoms"
                  className="block text-sm font-bold font-serif text-text-primary"
                >
                  Describe your symptoms
                </label>
                {isSupported && (
                  <button
                    type="button"
                    onClick={() =>
                      isRecording ? stopRecording(handleTranscript) : startRecording()
                    }
                    disabled={isProcessing}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      isRecording
                        ? "bg-error text-white animate-pulse"
                        : isProcessing
                        ? "bg-surface-variant text-on-surface-variant opacity-70 cursor-not-allowed"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                    aria-label={isRecording ? "Stop recording" : "Start voice input"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h-3v2h8v-2h-3v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
                    </svg>
                    {isProcessing ? "Transcribing..." : isRecording ? "Recording..." : "Speak"}
                  </button>
                )}
              </div>
              <textarea
                id="dashboard-symptoms"
                required
                minLength={10}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Describe what you're feeling... (e.g., I've had a persistent headache, mild fever, and sore throat for the past 3 days)"
                className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-surface min-h-[120px]"
                aria-label="Describe your symptoms"
                aria-required="true"
                aria-describedby={error ? "symptoms-error" : undefined}
              />
            </div>

            {micError && <div className="text-error text-sm mt-2" role="alert">{micError}</div>}
            {error && (
              <p id="symptoms-error" className="text-sm text-error" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full py-6 text-base font-bold shadow-sm"
              disabled={isSubmitting || symptoms.trim().length < 10}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Analyzing..." : "Find Matching Doctors"}
            </Button>
          </form>
        </div>

        {/* Result & Streaming State */}
        {(isSubmitting || result) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Show emergency UI if the stream determines it's an emergency early or final */}
            {(streamingSpecialization === 'EMERGENCY' || result?.matchedSpecialization === 'EMERGENCY') ? (
              <div className="bg-red-50 border-2 border-error rounded-xl p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-error flex items-center justify-center mx-auto shadow-soft animate-pulse">
                  <ExclamationTriangleIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-serif text-3xl font-bold text-error">
                  Seek Immediate Emergency Care
                </h3>
                <p className="text-on-surface-variant text-lg max-w-lg mx-auto">
                  Based on your symptoms, this could be a life-threatening situation. 
                  Please stop using this app and <strong>call 911</strong> or go to the 
                  nearest emergency department immediately.
                </p>
                <div className="pt-4">
                  <Button variant="destructive" size="lg" className="w-full sm:w-auto" asChild>
                    <a href="tel:911">Call Emergency Services</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#48cab6]/10 to-[#31a795]/10 rounded-xl p-8 border border-primary/20 text-center transition-all duration-300">
                <p className="text-sm font-bold uppercase tracking-wider text-primary mb-2">
                  {isSubmitting ? "Analyzing Symptoms..." : "Recommendation"}
                </p>
                <p className="text-on-surface-variant mb-4">
                  Based on your symptoms, we recommend consulting a:
                </p>
                
                {/* Specialization Placeholder or Actual */}
                <h3 className={`font-serif text-3xl md:text-4xl font-bold mb-2 transition-all duration-500 ${isSubmitting && !streamingSpecialization ? 'text-primary/30 animate-pulse' : 'text-primary'}`}>
                  {streamingSpecialization || result?.matchedSpecialization || "Determining Specialist..."}
                </h3>
                
                {/* Typing Explanation */}
                <div className="text-on-surface-variant text-sm leading-relaxed italic mb-8 border-l-4 border-primary/30 pl-4 text-left min-h-[4rem]">
                  {streamingExplanation || result?.aiExplanation || (isSubmitting ? "Reading your symptoms and evaluating conditions..." : "")}
                  {isSubmitting && <span className="inline-block w-1.5 h-4 ml-1 bg-primary/70 animate-pulse align-middle"></span>}
                </div>

                {/* Final Actions (Only show when stream completes) */}
                {!isSubmitting && result && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in zoom-in duration-500 delay-150">
                    <Button asChild size="lg" className="shadow-soft">
                      <Link href={`/dashboard/find-doctors?specialization=${encodeURIComponent(result.matchedSpecialization)}`}>
                        Find {result.matchedSpecialization}s
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link href="/dashboard/find-doctors">Browse all doctors</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recent Searches — always shown (user is always authenticated here) */}
        <div className="pt-8 border-t border-outline-variant/30">
          <h3 className="font-serif text-xl font-bold text-text-primary mb-6">
            Recent Searches
          </h3>

          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : history.length === 0 ? (
            <p className="text-on-surface-variant text-sm text-center py-8 bg-surface-white rounded-lg border border-outline-variant/30">
              You haven&apos;t made any searches yet.
            </p>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface-white rounded-lg p-5 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 text-xs text-on-surface-variant">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {new Date(item.createdAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <p className="text-sm text-on-surface-variant line-clamp-2 italic">
                      &ldquo;{item.symptomInput}&rdquo;
                    </p>
                    {item.aiExplanation && (
                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-1 italic opacity-70">
                        {item.aiExplanation}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm font-semibold">
                      {item.matchedSpecialization}
                    </div>
                    <button
                      onClick={() => {
                        setSymptoms(item.symptomInput);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-primary hover:text-primary-container p-2 rounded-full hover:bg-primary/5 transition-colors"
                      title="Search again"
                      aria-label={`Search again with: ${item.symptomInput}`}
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
