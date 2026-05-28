"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SymptomWidget() {
  const [symptoms, setSymptoms] = useState("");
  const router = useRouter();

  const handleSubmit = () => {
    if (symptoms.trim().length < 10) return;
    router.push(`/recommendations?symptoms=${encodeURIComponent(symptoms.trim())}`);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-xl shadow-lifted p-6 space-y-4">
      <textarea
        className="w-full min-h-[100px] p-4 rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary bg-surface-container-lowest text-on-surface transition-all outline-none resize-none"
        placeholder="e.g., I've had a headache for 3 days with nausea..."
        value={symptoms}
        onChange={(e) => setSymptoms(e.target.value)}
        aria-label="Describe your symptoms"
      />
      <Button
        size="lg"
        className="w-full rounded-xl"
        disabled={symptoms.trim().length < 10}
        onClick={handleSubmit}
      >
        Find the Right Doctor →
      </Button>
      <p className="text-center text-sm text-on-surface-variant">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Log in
        </Link>
        {" · "}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
