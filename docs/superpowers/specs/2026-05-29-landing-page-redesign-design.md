# Landing Page Redesign: Patient-Centric Entry + Recommendation System Navigation

**Date:** 2026-05-29  
**Branch:** `frontend/recommendation-system`

## Goal

Make the landing page immediately useful for first-time patients who don't know which doctor they need, and surface the anonymous recommendation system as the primary entry point.

## Scope

Four files changed + one page updated to read a query param:

1. `frontend/src/components/layout/header.tsx` — add nav link
2. `frontend/src/components/layout/hero-section.tsx` — embed symptom widget, update copy/stats
3. `frontend/src/components/layout/features-section.tsx` — add step badges to cards
4. `frontend/src/components/layout/cta-section.tsx` — redirect CTA to `/recommendations`
5. `frontend/src/app/recommendations/page.tsx` — read `?symptoms` query param, pre-fill + skip welcome step

---

## Section 1: Header

Add "Find the Right Doctor" to the desktop nav. Final order:

```
Features · Find the Right Doctor · Find a Doctor · For Doctors
```

"Find the Right Doctor" (AI symptom checker) appears before "Find a Doctor" (directory browse) to funnel uncertain patients to the guided tool first.

- Route: `/recommendations`
- Same style as existing nav links (`text-sm font-medium text-on-surface-variant hover:text-primary transition-colors`)
- No mobile nav changes (mobile nav not currently implemented)

---

## Section 2: Hero Section

### Approach
Centered layout preserved. The two CTA buttons are replaced by an inline symptom-input card widget.

### Headline (updated)
> "Not sure which doctor to see? Describe your symptoms, and we'll guide you."

### Subtext (updated)
> "Ginhawa's AI matches your symptoms to the right specialist — in seconds, before you book anything."

### Widget (replaces CTA buttons)
- White card, `shadow-lifted rounded-xl`, max-w-lg, centered
- `<textarea>` with placeholder: `"e.g., I've had a headache for 3 days with nausea..."`
- Min-height: 100px
- On submit: `router.push('/recommendations?symptoms=' + encodeURIComponent(symptoms))`
- Submit button: full-width, teal gradient, label "Find the Right Doctor →", disabled when input < 10 chars
- Below button: small muted text — "Already have an account? [Log in] · [Sign up free]"

### Component architecture
`hero-section.tsx` is currently a server component. The textarea widget requires client-side state (`useState`, `useRouter`). Extract as a separate `SymptomWidget` client component (`"use client"`) and import it into the server-rendered `HeroSection`. The static headline, subtext, and stats remain server-rendered.

### Stats (updated — replaces fabricated social proof)
| Stat | Label |
|------|-------|
| AI-Powered | Symptom Analysis |
| Free to Use | No credit card |
| No Account Needed | Start immediately |
| 100% Secure | Private & encrypted |

These reflect what is actually true for an anonymous first-time visitor.

---

## Section 3: Features Section

Add a numbered step badge to each feature card. Badge: small teal circle (`bg-primary text-white`) with step number, positioned top-left above the existing icon.

| Step | Feature | Copy change |
|------|---------|-------------|
| 1 | Symptom-Based Matching | "Describe how you feel, and our AI suggests the right specialist. No account needed." |
| 2 | Easy Scheduling | (unchanged) |
| 3 | Secure Consultations | (unchanged) |
| 4 | Health Records | (unchanged) |

Section headline unchanged: "Healthcare designed for your peace of mind"

---

## Section 4: CTA Section

### Headline (updated)
> "Ready to find the right care?"

### Body (updated)
> "Answer a few questions about your symptoms and Ginhawa will match you to the right specialist — free, no account needed."

### Buttons
- Primary: "Check My Symptoms →" → `/recommendations`
- Secondary (outline): "Browse all doctors →" → `/doctors`

---

## Section 5: Recommendations Page — Query Param Pre-fill

### Behavior
When `/recommendations?symptoms=<value>` is loaded:
1. `useSearchParams()` reads `symptoms` param on mount
2. `setSymptoms(decoded value)` pre-fills textarea
3. `setStep(2)` skips the welcome screen (step 1) directly to symptoms input

### Implementation
- `useSearchParams` from `next/navigation` (already a client component)
- Single `useEffect` on mount, runs once
- No change to the rest of the page logic

### Edge cases
- Empty or missing param: normal flow (step 1 welcome screen)
- Param present but < 10 chars: pre-fill but keep Analyze button disabled (existing validation)

---

## Non-scope

- Mobile hamburger menu (not currently implemented)
- Showcase, Testimonials, FAQ, Footer sections
- Logged-in patient recommendation flow (separate page/dashboard)
- Any backend changes
