"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { ActivityLogIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import type { RecommendationLog } from "@/types/api";

export default function RecommendationsPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState<RecommendationLog | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface pb-20 pt-12">
        <div className="max-w-2xl mx-auto px-4">
          {step === 1 && <WelcomeStep onStart={() => setStep(2)} />}
        </div>
      </main>
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
        
        <Card className="p-6 bg-surface-container-low border-info/20 text-left max-w-lg mx-auto">
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
