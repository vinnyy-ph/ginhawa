"use client";

import { useState } from "react";
import Link from "next/link";
import { parse } from "partial-json";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ActivityLogIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

type WidgetState = "idle" | "analyzing" | "result" | "emergency";

export function InlineRecommendationWidget() {
  const [widgetState, setWidgetState] = useState<WidgetState>("idle");
  const [symptoms, setSymptoms] = useState("");
  const [streamingSpecialization, setStreamingSpecialization] = useState<string | null>(null);
  const [streamingExplanation, setStreamingExplanation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (symptoms.trim().length < 10) return;

    setWidgetState("analyzing");
    setError(null);
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
          const chunk = decoder.decode(value, { stream: true });
          if (chunk.includes('{"error":')) throw new Error("Stream failed midway");
          fullText += chunk;
          try {
            const parsed = parse(fullText);
            if (typeof parsed === "object" && parsed !== null) {
              if (parsed.explanation) setStreamingExplanation(parsed.explanation);
              if (parsed.specialization) setStreamingSpecialization(parsed.specialization);
            }
          } catch {
            // ignore partial parse errors during streaming
          }
        }
      }

      const finalParsed = parse(fullText) as { specialization: string; explanation: string };
      if (!finalParsed.specialization || !finalParsed.explanation) {
        throw new Error("Received incomplete data from the server.");
      }

      setStreamingSpecialization(finalParsed.specialization);
      setStreamingExplanation(finalParsed.explanation);
      setWidgetState(finalParsed.specialization === "EMERGENCY" ? "emergency" : "result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setWidgetState("idle");
    }
  };

  const handleReset = () => {
    setWidgetState("idle");
    setSymptoms("");
    setStreamingSpecialization(null);
    setStreamingExplanation("");
    setError(null);
  };

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-white shadow-lifted">
      <div
        className="absolute inset-0 bg-[radial-gradient(600px_circle_at_60%_20%,rgba(72,202,182,0.18),transparent_55%)]"
        aria-hidden="true"
      />
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-secondary-container/40 bg-secondary-container/25">
              <ActivityLogIcon className="h-5 w-5 text-on-secondary-container" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-on-surface-variant">Powered by Gemini</p>
              <CardTitle className="text-xl">Symptom Check</CardTitle>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="border border-secondary-container/40 bg-secondary-container/25 text-on-secondary-container"
          >
            AI
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {widgetState === "idle" && (
          <div className="space-y-4">
            <textarea
              className="w-full min-h-[120px] resize-none rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
              placeholder="e.g., I've had a headache for 3 days with nausea..."
              value={symptoms}
              onChange={(e) => { setSymptoms(e.target.value); if (error) setError(null); }}
              aria-label="Describe your symptoms"
            />
            {error && (
              <p className="flex items-center gap-2 text-sm text-error" role="alert">
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
            <Button
              size="lg"
              className="w-full rounded-xl"
              disabled={symptoms.trim().length < 10}
              onClick={handleAnalyze}
            >
              Analyze Symptoms →
            </Button>
            <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Not a diagnosis. For emergencies, call 911 immediately.
            </p>
          </div>
        )}

        {widgetState === "analyzing" && (
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary-container/25 animate-pulse">
              <ActivityLogIcon className="h-8 w-8 text-on-secondary-container" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-on-surface-variant">Analyzing your symptoms...</p>
            {streamingSpecialization && (
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Recommended Specialist
                </p>
                <p className="text-2xl font-bold text-primary">{streamingSpecialization}</p>
              </div>
            )}
            {streamingExplanation && (
              <p className="border-l-4 border-primary/30 pl-3 text-left text-sm italic leading-relaxed text-on-surface-variant">
                {streamingExplanation}
                <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-primary/70 align-middle" />
              </p>
            )}
          </div>
        )}

        {widgetState === "result" && (
          <div className="space-y-5">
            <div className="rounded-xl bg-gradient-to-br from-primary to-primary-container p-6 text-center text-white">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest opacity-80">
                Recommended Specialist
              </p>
              <p className="text-3xl font-bold">{streamingSpecialization}</p>
            </div>
            {streamingExplanation && (
              <p className="border-l-4 border-primary/30 pl-3 text-sm italic leading-relaxed text-on-surface-variant">
                {streamingExplanation}
              </p>
            )}
            <Button size="lg" className="w-full rounded-xl" asChild>
              <Link
                href={`/doctors?specialization=${encodeURIComponent(streamingSpecialization ?? "")}`}
              >
                Find {streamingSpecialization}s
                <ChevronRightIcon className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Start over
              </button>
            </div>
          </div>
        )}

        {widgetState === "emergency" && (
          <div className="space-y-5">
            <div className="space-y-3 rounded-xl border-2 border-error bg-red-50/50 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-error/10">
                <ExclamationTriangleIcon className="h-7 w-7 text-error" aria-hidden="true" />
              </div>
              <p className="text-lg font-bold text-error">Emergency Detected</p>
              <p className="text-sm text-on-surface-variant">
                Your symptoms need immediate attention. Do not book a telehealth consultation.
              </p>
            </div>
            <Button size="lg" variant="destructive" className="w-full rounded-xl font-bold" asChild>
              <a href="tel:911">Call 911 Now</a>
            </Button>
            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Start over
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
