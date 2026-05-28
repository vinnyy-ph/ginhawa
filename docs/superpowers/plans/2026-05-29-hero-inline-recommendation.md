# Hero Inline Recommendation Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the landing page hero to match the `/for-doctors` split layout, replacing the navigate-away `SymptomWidget` with a fully self-contained card that streams AI recommendations inline and links to filtered `/doctors`.

**Architecture:** New `InlineRecommendationWidget` client component embeds the same streaming fetch logic from `recommendations/page.tsx`. `HeroSection` is rewritten to a 12-col split (text left, card right) mirroring `/for-doctors`. `SymptomWidget` is deleted. Skip link removed from `recommendations/page.tsx`.

**Tech Stack:** Next.js App Router, React `useState`, `fetch` streaming, `partial-json` (already installed), Tailwind CSS with Ginhawa design tokens, `@radix-ui/react-icons`, shadcn `Card`/`Button`/`Badge`.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/components/ui/inline-recommendation-widget.tsx` | **CREATE** — full inline recommendation flow |
| `frontend/src/components/layout/hero-section.tsx` | **REWRITE** — split layout, imports widget |
| `frontend/src/components/ui/symptom-widget.tsx` | **DELETE** |
| `frontend/src/app/recommendations/page.tsx` | **MODIFY** — remove skip link |

---

### Task 1: Create `InlineRecommendationWidget` client component

**Files:**
- Create: `frontend/src/components/ui/inline-recommendation-widget.tsx`

This is the full recommendation flow card: idle (textarea) → analyzing (streaming) → result → emergency. Contains all streaming fetch logic extracted from `recommendations/page.tsx`.

- [ ] **Step 1: Create the file**

```tsx
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
              onChange={(e) => setSymptoms(e.target.value)}
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
```

- [ ] **Step 2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/inline-recommendation-widget.tsx
git commit -m "feat(frontend): add InlineRecommendationWidget with full streaming flow"
```

---

### Task 2: Rewrite `HeroSection` — split layout

**Files:**
- Modify: `frontend/src/components/layout/hero-section.tsx`

Replace the entire file. Matches `/for-doctors` 12-col split exactly. Left col-7: badge/headline/subtext/checkmarks/auth links. Right col-5: `InlineRecommendationWidget`.

- [ ] **Step 1: Rewrite the file**

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/ui/fade-in";
import { InlineRecommendationWidget } from "@/components/ui/inline-recommendation-widget";
import { ActivityLogIcon, CheckCircledIcon } from "@radix-ui/react-icons";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-16 sm:py-20 lg:py-28">
      <div className="absolute inset-0">
        <div className="absolute -top-24 right-[-20%] h-[520px] w-[520px] rounded-full bg-primary-container/15 blur-3xl" />
        <div className="absolute -bottom-24 left-[-18%] h-[520px] w-[520px] rounded-full bg-secondary-container/12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_10%,rgba(72,202,182,0.10),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(49,167,149,0.12),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <FadeIn>
              <div className="mb-5 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="border border-secondary-container/60 bg-secondary-container/25 text-on-secondary-container"
                >
                  <ActivityLogIcon className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  AI-Powered Symptom Matching
                </Badge>
              </div>

              <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
                Not sure which doctor to see?{" "}
                <span className="text-primary">Describe your symptoms.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-on-surface-variant">
                Ginhawa&apos;s AI reads what you&apos;re feeling and tells you exactly which
                specialist to visit — free, no account needed.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-2">
                  <CheckCircledIcon className="h-4 w-4 text-success" aria-hidden="true" />
                  Free to use
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircledIcon className="h-4 w-4 text-success" aria-hidden="true" />
                  No account needed
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircledIcon className="h-4 w-4 text-success" aria-hidden="true" />
                  Results in seconds
                </span>
              </div>

              <p className="mt-6 text-sm text-on-surface-variant">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Log in
                </Link>
                {" · "}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                  Sign up free
                </Link>
              </p>
            </FadeIn>
          </div>

          <div className="lg:col-span-5">
            <FadeIn direction="left" delay={0.12}>
              <InlineRecommendationWidget />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/hero-section.tsx
git commit -m "feat(frontend): rewrite hero with split layout and inline recommendation widget"
```

---

### Task 3: Remove skip link + delete `symptom-widget.tsx`

**Files:**
- Modify: `frontend/src/app/recommendations/page.tsx` — remove skip `<a>` tag (lines 107-112)
- Delete: `frontend/src/components/ui/symptom-widget.tsx`

- [ ] **Step 1: Remove skip link from `recommendations/page.tsx`**

Find and remove this block (it is the first element inside the `<>` fragment in `RecommendationsPage`'s return):

```tsx
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:p-4 focus:rounded-lg focus:shadow-lg focus:text-primary focus:font-bold"
      >
        Skip to main content
      </a>
```

After removal the return should open directly with `<Header />`.

- [ ] **Step 2: Delete `symptom-widget.tsx`**

```bash
rm frontend/src/components/ui/symptom-widget.tsx
```

- [ ] **Step 3: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit
```

Expected: no errors. If tsc complains about `symptom-widget` import, check `hero-section.tsx` (Task 2 already removed that import).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/recommendations/page.tsx
git rm frontend/src/components/ui/symptom-widget.tsx
git commit -m "chore(frontend): remove skip link and delete replaced SymptomWidget"
```

---

### Task 4: End-to-end browser verification

- [ ] **Step 1: Start dev server (if not running)**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Verify hero layout**

Open `http://localhost:3000`. Confirm:
- Left side: badge "AI-Powered Symptom Matching", headline "Not sure which doctor to see? Describe your symptoms.", 3 checkmarks, Log in/Sign up links
- Right side: card with "Symptom Check" header, textarea, "Analyze Symptoms →" button disabled

- [ ] **Step 3: Verify idle → analyzing → result flow**

Type 10+ characters in the textarea (e.g., "I have had a persistent headache for three days"). Click "Analyze Symptoms →". Confirm:
- Card transitions to analyzing state (pulsing icon, "Analyzing your symptoms...")
- Streaming specialization appears as it arrives
- Card transitions to result state: gradient box with specialist name, AI explanation, "Find [X]s →" button
- Button href is `/doctors?specialization=<encoded name>`

- [ ] **Step 4: Verify "Start over"**

Click "Start over". Confirm card resets to idle state with empty textarea.

- [ ] **Step 5: Verify no skip link on `/recommendations`**

Open `http://localhost:3000/recommendations`. Tab through the page. Confirm no "Skip to main content" link appears.

- [ ] **Step 6: Verify `/recommendations` direct visit still works**

Confirm the recommendations page still shows step 1 (welcome screen) normally. Step-based flow for logged-in patients is unaffected.
