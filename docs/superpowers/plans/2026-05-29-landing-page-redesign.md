# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing page immediately useful for first-time patients by embedding a symptom-input widget in the hero, adding a recommendation nav link, updating supporting sections, and wiring the recommendation page to accept pre-filled symptoms via query param.

**Architecture:** Six surgical file edits — one new client component (`SymptomWidget`), four layout component updates, and one page update to read `?symptoms` query param on mount. No backend changes. No new routes.

**Tech Stack:** Next.js App Router, React `useState`/`useEffect`/`useRouter`/`useSearchParams` from `next/navigation`, Tailwind CSS with Ginhawa design tokens, shadcn `Button` + `Card` components.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/components/ui/symptom-widget.tsx` | **CREATE** — client component: textarea + submit → `/recommendations?symptoms=...` |
| `frontend/src/components/layout/header.tsx` | **MODIFY** — add "Find the Right Doctor" nav link |
| `frontend/src/components/layout/hero-section.tsx` | **MODIFY** — update headline/subtext/stats, import `SymptomWidget` |
| `frontend/src/components/layout/features-section.tsx` | **MODIFY** — add step badges, update step 1 copy |
| `frontend/src/components/layout/cta-section.tsx` | **MODIFY** — point CTA to `/recommendations`, update copy |
| `frontend/src/app/recommendations/page.tsx` | **MODIFY** — read `?symptoms` param on mount, pre-fill and skip to step 2 |

---

### Task 1: Add "Find the Right Doctor" nav link to header

**Files:**
- Modify: `frontend/src/components/layout/header.tsx`

- [ ] **Step 1: Add the nav link**

Open `frontend/src/components/layout/header.tsx`. In the `<nav>` block, insert the new link **before** the "Find a Doctor" link so the order is: Features · Find the Right Doctor · Find a Doctor · For Doctors.

```tsx
<nav className="hidden md:flex items-center gap-6">
  <Link
    href="#features"
    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
  >
    Features
  </Link>
  <Link
    href="/recommendations"
    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
  >
    Find the Right Doctor
  </Link>
  <Link
    href="/doctors"
    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
  >
    Find a Doctor
  </Link>
  <Link
    href="/for-doctors"
    className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
  >
    For Doctors
  </Link>
</nav>
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/header.tsx
git commit -m "feat(frontend): add recommendation nav link to header"
```

---

### Task 2: Create `SymptomWidget` client component

**Files:**
- Create: `frontend/src/components/ui/symptom-widget.tsx`

This is the textarea + submit card that lives in the hero. On submit it navigates to `/recommendations?symptoms=<encoded>`.

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/symptom-widget.tsx
git commit -m "feat(frontend): add SymptomWidget client component for hero"
```

---

### Task 3: Update `HeroSection` — embed widget, update copy and stats

**Files:**
- Modify: `frontend/src/components/layout/hero-section.tsx`

Replace the headline, subtext, CTA buttons, and stats. Import `SymptomWidget` (client component — fine to import into a server component).

- [ ] **Step 1: Rewrite the file**

```tsx
import { SymptomWidget } from "@/components/ui/symptom-widget";
import { FadeIn } from "@/components/ui/fade-in";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background py-20 lg:py-32">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 h-[600px] w-[600px] rounded-full bg-primary-container/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 h-[400px] w-[400px] rounded-full bg-secondary-container/10 blur-3xl" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 relative z-10">
        <FadeIn>
          <div className="flex flex-col items-center text-center">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-text-primary sm:text-6xl mb-6 font-serif">
              Not sure which doctor to see?{" "}
              <span className="text-primary">Describe your symptoms</span>, and we&apos;ll guide you.
            </h1>

            <p className="max-w-2xl text-lg text-on-surface-variant mb-10 leading-relaxed">
              Ginhawa&apos;s AI matches your symptoms to the right specialist — in seconds, before you book anything.
            </p>

            <SymptomWidget />

            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-text-primary">AI-Powered</span>
                <span className="text-sm text-on-surface-variant">Symptom Analysis</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-text-primary">Free to Use</span>
                <span className="text-sm text-on-surface-variant">No credit card</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-text-primary">No Account</span>
                <span className="text-sm text-on-surface-variant">Start immediately</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-text-primary">100% Secure</span>
                <span className="text-sm text-on-surface-variant">Private & encrypted</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/hero-section.tsx
git commit -m "feat(frontend): embed SymptomWidget in hero, update copy and stats"
```

---

### Task 4: Add step badges to `FeaturesSection`

**Files:**
- Modify: `frontend/src/components/layout/features-section.tsx`

Add a `step` number to each feature and render a small teal badge above the icon. Update step 1 copy to mention "no account needed."

- [ ] **Step 1: Rewrite the file**

```tsx
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MagnifyingGlassIcon, CalendarIcon, VideoIcon, ClipboardIcon } from "@radix-ui/react-icons";
import { FadeIn } from "@/components/ui/fade-in";

const features = [
  {
    step: 1,
    title: "Symptom-Based Matching",
    description: "Describe how you feel, and our AI suggests the right specialist. No account needed.",
    icon: MagnifyingGlassIcon,
    color: "bg-primary/10 text-primary",
  },
  {
    step: 2,
    title: "Easy Scheduling",
    description: "Book, reschedule, or cancel appointments with just a few clicks. Real-time availability at your fingertips.",
    icon: CalendarIcon,
    color: "bg-secondary-container/30 text-on-secondary-container",
  },
  {
    step: 3,
    title: "Secure Consultations",
    description: "Attend your doctor appointments from the comfort of your home with our integrated video platform.",
    icon: VideoIcon,
    color: "bg-tertiary-container/30 text-on-tertiary-container",
  },
  {
    step: 4,
    title: "Health Records",
    description: "Keep track of your medical history, prescriptions, and consultation notes in one secure place.",
    icon: ClipboardIcon,
    color: "bg-info/10 text-info",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-surface">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl mb-4 font-serif">
              Healthcare designed for your peace of mind
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-on-surface-variant">
              Ginhawa simplifies every step of your medical journey, from discovery to follow-up care.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <FadeIn key={index} delay={index * 0.1}>
              <Card className="border-none h-full hover:-translate-y-1 transition-transform duration-300">
                <CardHeader>
                  <div className="relative w-12 h-12 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                      {feature.step}
                    </span>
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/features-section.tsx
git commit -m "feat(frontend): add step badges to features section, update step 1 copy"
```

---

### Task 5: Update `CTASection` — point to `/recommendations`

**Files:**
- Modify: `frontend/src/components/layout/cta-section.tsx`

Update headline, body copy, and buttons. Primary CTA → `/recommendations`. Add secondary → `/doctors`.

- [ ] **Step 1: Rewrite the file**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";

export function CTASection() {
  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 -skew-y-3 origin-right scale-110" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-5xl mb-6 font-serif">
            Ready to find the right care?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-on-surface-variant mb-10">
            Answer a few questions about your symptoms and Ginhawa will match you to the right specialist — free, no account needed.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="rounded-full px-10" asChild>
              <Link href="/recommendations">Check My Symptoms →</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-10" asChild>
              <Link href="/doctors">Browse all doctors →</Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/cta-section.tsx
git commit -m "feat(frontend): update CTA section to point to recommendations"
```

---

### Task 6: Pre-fill recommendations page from `?symptoms` query param

**Files:**
- Modify: `frontend/src/app/recommendations/page.tsx`

When the page loads with `?symptoms=<value>`, pre-fill the textarea and skip step 1 (welcome screen) to go directly to step 2 (symptom input). The page is already a client component.

- [ ] **Step 1: Add `useSearchParams` import and mount effect**

At the top of `frontend/src/app/recommendations/page.tsx`, add `useSearchParams` to the existing import from `next/navigation` (or add the import if not present), then add a `useEffect` inside `RecommendationsPage` after the existing state declarations:

```tsx
// Add to existing React import line:
import React, { useState, useEffect } from "react";

// Add after existing import:
import { useSearchParams } from "next/navigation";
```

Inside `RecommendationsPage`, add after all `useState` declarations and before `handleTranscript`:

```tsx
const searchParams = useSearchParams();

useEffect(() => {
  const prefilledSymptoms = searchParams.get("symptoms");
  if (prefilledSymptoms) {
    setSymptoms(prefilledSymptoms);
    setStep(2);
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/recommendations/page.tsx
git commit -m "feat(frontend): pre-fill recommendations page from ?symptoms query param"
```

---

### Task 7: End-to-end browser verification

- [ ] **Step 1: Start the frontend dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Verify header**

Open `http://localhost:3000`. Confirm desktop nav shows: Features · **Find the Right Doctor** · Find a Doctor · For Doctors.

- [ ] **Step 3: Verify hero widget**

Confirm textarea and "Find the Right Doctor →" button visible in hero. Button should be disabled until 10+ characters typed. Type symptoms → click button → confirm redirect to `/recommendations` with symptoms pre-filled in textarea and step 2 (symptom input) visible (no welcome screen).

- [ ] **Step 4: Verify features step badges**

Scroll to Features section. Confirm teal numbered badges (1–4) appear on each card. Step 1 copy says "No account needed."

- [ ] **Step 5: Verify CTA section**

Scroll to bottom CTA. Confirm "Check My Symptoms →" links to `/recommendations` and "Browse all doctors →" links to `/doctors`.

- [ ] **Step 6: Verify direct recommendation page visit (no query param)**

Open `http://localhost:3000/recommendations`. Confirm welcome screen (step 1) still shows normally when no `?symptoms` param present.
