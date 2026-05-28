# Landing Page Hero: Inline Recommendation Widget — Design Spec

**Date:** 2026-05-29  
**Branch:** `frontend/recommendation-system`

## Goal

Redesign the landing page hero to match the `/for-doctors` split layout (text left, interactive card right) and replace the navigate-away `SymptomWidget` with a fully self-contained inline recommendation flow inside the card. Users describe symptoms, see AI results, and click to filtered doctors — all without leaving the landing page.

## Scope

| File | Change |
|------|--------|
| `frontend/src/components/layout/hero-section.tsx` | Full rewrite — split layout matching for-doctors |
| `frontend/src/components/ui/inline-recommendation-widget.tsx` | **CREATE** — full inline recommendation flow client component |
| `frontend/src/components/ui/symptom-widget.tsx` | **DELETE** — replaced by inline widget |
| `frontend/src/app/recommendations/page.tsx` | Remove skip-to-main-content `<a>` tag |

No backend changes. No new routes.

---

## Section 1: Layout

Hero section becomes a 12-column split identical in structure to `/for-doctors/page.tsx`:

```
lg:grid-cols-12
├── left  lg:col-span-7  — badge, headline, subtext, checkmarks, auth links
└── right lg:col-span-5  — InlineRecommendationWidget card
```

Same decorative background as for-doctors:
```tsx
<div className="absolute -top-24 right-[-20%] h-[520px] w-[520px] rounded-full bg-primary-container/15 blur-3xl" />
<div className="absolute -bottom-24 left-[-18%] h-[520px] w-[520px] rounded-full bg-secondary-container/12 blur-3xl" />
<div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_10%,rgba(72,202,182,0.10),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(49,167,149,0.12),transparent_55%)]" />
```

Mobile: columns stack — text above card.

---

## Section 2: Left Side Copy

### Badge
```tsx
<Badge variant="secondary" className="border border-secondary-container/60 bg-secondary-container/25 text-on-secondary-container">
  <ActivityLogIcon className="mr-2 h-3.5 w-3.5" />
  AI-Powered Symptom Matching
</Badge>
```

### Headline
```
Not sure which doctor to see?
Describe your symptoms.          ← "Describe your symptoms." in text-primary
```

### Subtext
```
Ginhawa's AI reads what you're feeling and tells you exactly which 
specialist to visit — free, no account needed.
```

### Checkmarks (same inline style as for-doctors)
```tsx
<CheckCircledIcon className="text-success" />  Free to use
<CheckCircledIcon className="text-success" />  No account needed
<CheckCircledIcon className="text-success" />  Results in seconds
```

### Auth links (below checkmarks, small muted text)
```
Already have an account? [Log in] · [Sign up free]
```

---

## Section 3: Right Side Card — InlineRecommendationWidget

### Card shell (matches Clinic Day Snapshot)
```tsx
<Card className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-white shadow-lifted">
  <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_60%_20%,rgba(72,202,182,0.18),transparent_55%)]" />
  <CardHeader className="relative pb-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-secondary-container/40 bg-secondary-container/25">
          <ActivityLogIcon className="h-5 w-5 text-on-secondary-container" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-on-surface-variant">Powered by Gemini</p>
          <CardTitle className="text-xl">Symptom Check</CardTitle>
        </div>
      </div>
      <Badge variant="secondary" className="bg-secondary-container/25 text-on-secondary-container border border-secondary-container/40">
        AI
      </Badge>
    </div>
  </CardHeader>
  <CardContent className="relative">
    {/* stateful content below */}
  </CardContent>
</Card>
```

### State machine
Component holds one of four states: `"idle" | "analyzing" | "result" | "emergency"`

---

### State: `idle`

```
┌─────────────────────────────────────────────┐
│ [textarea]                                   │
│  placeholder: "e.g., I've had a headache    │
│  for 3 days with nausea..."                 │
│  min-h-[120px], resize-none                 │
├─────────────────────────────────────────────┤
│ [Analyze Symptoms →]  full-width button     │
│  disabled when < 10 chars                   │
├─────────────────────────────────────────────┤
│ ⚠ Not a diagnosis. For emergencies, 911.   │
│  (small muted text, ExclamationTriangleIcon) │
└─────────────────────────────────────────────┘
```

Textarea styling: `border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary bg-surface-container-lowest text-on-surface rounded-xl`

---

### State: `analyzing`

```
┌─────────────────────────────────────────────┐
│  [pulsing teal circle with ActivityLogIcon]  │
│  "Analyzing your symptoms..."               │
│                                             │
│  [streaming specialization — large, primary]│
│  (animate-pulse opacity-50 until it arrives)│
│                                             │
│  [streaming explanation — italic, muted]    │
│  [blinking cursor while streaming]          │
└─────────────────────────────────────────────┘
```

Streams from `POST /recommendations` (same endpoint as existing recommendations page, same `partial-json` parse logic).

---

### State: `result`

```
┌─────────────────────────────────────────────┐
│  "Recommended Specialist"  (xs uppercase)   │
│  [Specialist Name]  (2xl bold text-primary) │
│                                             │
│  [AI explanation — italic, muted, border-l] │
│                                             │
│  [Find {Specialist}s →]  full-width button  │
│    → /doctors?specialization={encoded}      │
│                                             │
│  [Start over]  centered link                │
└─────────────────────────────────────────────┘
```

---

### State: `emergency`

```
┌─────────────────────────────────────────────┐
│  [ExclamationTriangleIcon, animate-pulse]    │
│  "Emergency Detected"  (bold, text-error)   │
│  "Your symptoms need immediate attention."  │
│                                             │
│  [Call 911 Now]  → tel:911  (destructive)   │
│  [Start over]  link                         │
└─────────────────────────────────────────────┘
```

---

## Section 4: Streaming Logic

The `InlineRecommendationWidget` embeds the same streaming fetch that currently lives in `recommendations/page.tsx`. Extract it as the component's `handleAnalyze` function:

```
fetch POST /recommendations { symptomInput: symptoms }
→ stream partial JSON via ReadableStream
→ parse with `partial-json` (already installed)
→ update streamingSpecialization + streamingExplanation on each chunk
→ on stream end: set state to "result" (or "emergency" if specialization === "EMERGENCY")
→ on error: show error in idle state, reset
```

Error handling: on catch, return to `idle` state and show error message below textarea (reuse existing `text-error` pattern).

---

## Section 5: Skip Link Removal

Remove from `frontend/src/app/recommendations/page.tsx`:
```tsx
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:fixed ..."
>
  Skip to main content
</a>
```

---

## Section 6: SymptomWidget Deletion

`frontend/src/components/ui/symptom-widget.tsx` — delete. No other file imports it after `hero-section.tsx` is rewritten.

---

## Non-scope

- `/recommendations` page content (keep as-is for logged-in patient flow, minus skip link)
- Mobile hamburger nav
- Features, Testimonials, FAQ, CTA, Footer sections
- Backend changes
- Speech-to-text in hero card
