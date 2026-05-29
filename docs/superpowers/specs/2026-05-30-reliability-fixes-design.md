# Slice 1 — Reliability Fixes (Design)

**Date:** 2026-05-30
**Source:** `docs/grill_app.md` product critique, re-scoped to MVP reliability + UX.
**Goal:** Stop the app from losing data, ejecting users, or rendering broken/wrong state. No new features, no compliance work, no design-system refactor.

## Context

A product review (`docs/grill_app.md`) flagged ~30 issues. The user re-scoped to MVP and asked to focus only on **"how it works smoothly without things breaking"** — reliability and core UX, explicitly excluding the trust/compliance framing (Privacy/Terms pages, PRC verification/liability, ratings-as-trust) and pure design-system/accessibility polish.

The full backlog was decomposed into two slices:

- **Slice 1 — Reliability (this spec):** nothing breaks, nothing vanishes.
- **Slice 2 — UX friction (later):** disabled-button reasons, onboarding skip, mobile nav, dashboard launchpad, decline-with-reason, etc.

This spec covers Slice 1 only. Each item below was verified against current code before inclusion. Items already addressed by recent commits (booking copy, Join surfacing, Complete&Document gating) are excluded.

## Items

### 1. Onboarding state persistence

**Problem:** `frontend/src/context/onboarding-context.tsx` and `doctor-onboarding-context.tsx` hold all wizard state in a single `useState` with zero persistence. Refresh, browser back, deep-link to a later step, or a backgrounded tab wipes name, DOB, weight, blood type, allergies, and full medical history back to defaults.

**Fix:**
- Persist `data` to `sessionStorage` on every change (effect on `data`).
- Lazy-initialize `useState` from `sessionStorage` on mount; fall back to defaults.
- Clear the key on successful submit.
- Wrap `JSON.parse` in try/catch — corrupt/old data falls back to defaults silently.

**Keys:** `ginhawa.onboarding.patient`, `ginhawa.onboarding.doctor`.

**Why sessionStorage (not localStorage):** survives refresh / back / deep-link within the tab, but leaves no medical PII behind after the tab closes — appropriate for shared phones.

**Note:** stored data is already serializable (strings/numbers/arrays); the profile picture is stored as a URL string after upload, and the transient `File` lives in step-5 local state, not the context — so no serialization issue.

### 2. Doctor PRC license persistence

**Problem:** `backend/src/doctors/doctors.service.ts` `upsertProfile` builds `profileData` that omits `prcLicenseNo`, `prcLicenseExpiry`, `ptrNo`, `region`, `city` — the DTO carries them and the Prisma columns exist, but the values are dropped. Separately, `doctor/profile/page.tsx` sets the expiry `DatePicker` `minDate` to today, blocking entry of an already-expired license (a historical fact).

**Fix:**
- Add the five fields to `profileData` so they persist.
- Remove the `minDate` constraint on the PRC-expiry picker.
- **No verification.** `profileComplete` behavior is unchanged — the flow still completes. This is purely a data-loss fix, not a verification feature.

### 3. Symptom-check result persistence

**Problem:** `recommendations/page.tsx` POSTs to `/recommendations` with **no Authorization header**, so the backend resolves `userId: null` and saves the log orphaned (`patientId: null`). The result is also shown locally with a fabricated `temp-${Date.now()}` id and never added to "Your past symptom checks," so it appears to vanish.

**Backend is already correct:** `recommendations.controller.ts` uses `@OptionalJwt()`, and `recommendations.service.ts:168` persists the log whenever a `patientId` resolves. The gap is entirely frontend.

**Fix (frontend only):**
- Send `Authorization: Bearer ${token}` on the POST when the user is logged in.
- After the stream completes, refetch `/recommendations` so the new check appears in history with its real id (no `temp-`).
- No backend change.

### 4. Doctor dashboard silent failure

**Problem:** `doctor/dashboard/doctor-dashboard-client.tsx:42-46` — on a failed load the `catch` only `console.error`s and renders `0 pending / 0 confirmed / "No appointments today"`. A flaky network makes a doctor believe their day is empty.

**Fix:**
- Add an `error` state; set it in `catch`.
- When set, render an error message + **Retry** action (mirror the existing discovery `ErrorState` pattern) instead of an authoritative empty state.

### 5. Timezone pinning

**Problem:** 18 `toLocaleTimeString`/`toLocaleDateString` calls across 11 files pass `'en-PH'` (formatting only) but **no `timeZone`**, so times render in the viewer's machine timezone. Two notification calls omit the locale entirely. No shared date util exists (`lib/format.ts` has only ID/phone helpers).

**Fix:**
- Add shared formatters in `lib/` — e.g. `formatPHTime`, `formatPHDate`, `formatPHDateTime` — each passing `timeZone: 'Asia/Manila'`.
- Replace all 18 call sites (plus the 2 locale-less notification calls) with these helpers.
- Append a small `PHT` label on standalone appointment times so the timezone is explicit.

### 6. Join button visibility

**Problem:** Join now surfaces on the card (recent fix) but appears only inside the 15-min window, with **no countdown** and **no auto-refresh** — the list fetches once on mount, so on the day of the appointment Join may never appear without a manual reload.

**Fix:**
- Poll the appointments list (~30s interval) on the patient and doctor appointment pages so Join surfaces without a manual reload.
- On the card, show `Join opens at 2:45 PM` and a live countdown when the slot is near.

### 7. Consultation call resilience

**Problem:** `consultation/[appointmentId]/page.tsx:68-70` — the patient's `participant-left` handler does an immediate `router.push('/appointments')`. A transient doctor disconnect (common on mobile/clinic networks) ejects the patient mid-call with no message, even though no real end occurred. A clean end signal already exists: the doctor's "End & Finalize" sends a `call-ended` app-message that the patient already handles (`:64`).

**Fix (chosen approach: reconnecting + manual return):**
- Remove the `participant-left → router.push` redirect.
- On `participant-left`, show a **non-blocking overlay** "Doctor disconnected — reconnecting…" while the video frame stays mounted.
- On `participant-joined`, dismiss the overlay.
- After **60s** with no rejoin, swap the overlay to a **"Return to appointments"** button (manual; never auto-eject).
- Auto-leave the call **only** on the explicit `call-ended` app-message (unchanged).

## Cross-cutting

- **Independence:** all 7 items touch disjoint files/subsystems and can be implemented in parallel.
- **Frontend constraint:** per `frontend/AGENTS.md`, this is a modified Next.js — read the relevant guide in `node_modules/next/dist/docs/` before writing frontend code.
- **Testing:** backend has Jest (e.g. an existing recommendations service test); add/adjust where a service changes (PRC). Frontend items verified by exercising the flows (refresh during onboarding, simulated doctor disconnect, permission denial, dashboard load failure, timezone rendering).

## Out of scope (Slice 2 and beyond)

Disabled-button reasons, onboarding skip-to-booking, DOB picker ergonomics, patient mobile bottom-nav, doctor dashboard launchpad (clickable stats / today filter / Join in rows), gating the two competing primary actions, confirm-booking success toast, decline-with-reason, mobile Notifications reachability, prescription rendered as clean list, identity papercuts ("Dr. Dr.", UUID id). Camera/mic permission UX is **not** in this slice (deferred to Slice 2 unless re-prioritized).
