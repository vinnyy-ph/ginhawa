# Slice 1 — Reliability Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the Ginhawa telehealth app from losing data, ejecting users, or rendering broken/wrong state — 7 independent reliability fixes across the NestJS backend and Next.js frontend.

**Architecture:** Each task is self-contained and touches a disjoint set of files. Backend changes (PRC persistence) are covered by Jest unit tests (TDD). The frontend has **no test runner** (scripts are only `lint` + `build`), so frontend tasks are verified with `npm run lint` + `npm run build` (Next's build performs the typecheck) + a described manual check. Adding a frontend test framework is out of scope for this MVP.

**Tech Stack:** NestJS 11 + Prisma 7 + Jest (backend); Next.js 16 (App Router) + React 19 + Tailwind v4 + next-auth + @daily-co/daily-js (frontend).

**Repo constraints:**
- `frontend/AGENTS.md`: this is a **modified Next.js** — read the relevant guide in `node_modules/next/dist/docs/` before writing frontend code; heed deprecation notices.
- `CLAUDE.md`: surgical changes only. Touch only what each task requires. Don't reformat adjacent code.
- Commands run from the relevant package dir: backend cmds in `backend/`, frontend cmds in `frontend/`.
- There is pre-existing uncommitted work (`backend/prisma/seed.ts`, `docs/grill_app.md`). Do **not** stage those; each commit stages only the files it touched.

---

## Task 1: Shared Asia/Manila datetime formatter

**Problem:** 18 `toLocaleTimeString`/`toLocaleDateString` calls pass `'en-PH'` but no `timeZone`, so times render in the viewer's machine timezone. Two notification calls omit the locale entirely. No shared date util exists.

**Files:**
- Create: `frontend/src/lib/datetime.ts`
- Modify: every frontend file containing a `toLocaleTimeString(` or `toLocaleDateString(` **display** call (enumerated in Step 3).

- [ ] **Step 1: Create the shared formatter**

Create `frontend/src/lib/datetime.ts`:

```ts
// frontend/src/lib/datetime.ts
// All appointment/clinical times are Manila-local. These helpers pin the
// timezone so a viewer on a non-PH machine clock still sees the real PH time.

const PH_TZ = 'Asia/Manila';
const LOCALE = 'en-PH';

type DateInput = string | number | Date;

/** Format a time, e.g. "2:45 PM". Always rendered in Asia/Manila. */
export function formatPHTime(
  value: DateInput,
  opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' },
): string {
  return new Date(value).toLocaleTimeString(LOCALE, { ...opts, timeZone: PH_TZ });
}

/** Format a date, e.g. "May 30, 2026". Always rendered in Asia/Manila. */
export function formatPHDate(
  value: DateInput,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  return new Date(value).toLocaleDateString(LOCALE, { ...opts, timeZone: PH_TZ });
}
```

- [ ] **Step 2: Verify the helper compiles**

Run (in `frontend/`): `npm run lint`
Expected: no errors referencing `src/lib/datetime.ts`.

- [ ] **Step 3: Replace every display call site**

Find all sites: search `frontend/src` for `toLocaleTimeString(` and `toLocaleDateString(`. Replace each call as follows, preserving the existing options object:
- `new Date(X).toLocaleTimeString('en-PH', OPTS)` → `formatPHTime(X, OPTS)` (drop `OPTS` if it equals the default `{ hour: 'numeric', minute: '2-digit' }`)
- `new Date(X).toLocaleDateString('en-PH', OPTS)` → `formatPHDate(X, OPTS)`
- The two locale-less calls — `notifications/page.tsx` and `doctor/notifications/page.tsx` (`date.toLocaleDateString()`) — → `formatPHDate(date)`
- Add `import { formatPHTime, formatPHDate } from '@/lib/datetime';` to each modified file (import only the helpers it uses).

Known sites (verify by grep — list may shift by a few lines):
`components/booking/slot-picker.tsx`, `components/appointment-card.tsx` (patient + doctor time/date strings), `app/records/page.tsx`, `components/patient-home.tsx`, `app/doctor/schedule/page.tsx`, `app/doctor/patients/[id]/page.tsx`, `app/doctor/patients/page.tsx`, `app/doctor/finalize/[appointmentId]/page.tsx`, `app/doctor/notifications/page.tsx`, `app/notifications/page.tsx`, `app/doctor/dashboard/page.tsx`.

**Do NOT touch** `new Date(...).toDateString()` comparison calls (e.g. in `doctor-dashboard-client.tsx` "today" filtering) — those are not display and are out of scope.

- [ ] **Step 4: Append a "PHT" label on standalone appointment times**

In `components/appointment-card.tsx`, both the patient `timeStr` and doctor `timeStr`, append ` PHT` to the rendered time range so the timezone is explicit. Patient example:

```ts
const timeStr = slot ? `${formatPHTime(slot.startTime)} - ${formatPHTime(slot.endTime)} PHT` : '';
```

Doctor `timeStr`: `slot ? `${formatPHTime(slot.startTime)} PHT` : ''`.

- [ ] **Step 5: Verify**

Run (in `frontend/`): `npm run lint`
Expected: PASS (no unused-import or undefined errors).
Manual: grep again for `toLocaleTimeString('en-PH'` / `toLocaleDateString('en-PH'` — expect zero display matches remaining.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/datetime.ts frontend/src/components/appointment-card.tsx frontend/src/components/booking/slot-picker.tsx frontend/src/components/patient-home.tsx "frontend/src/app/records/page.tsx" "frontend/src/app/doctor/schedule/page.tsx" "frontend/src/app/doctor/patients/[id]/page.tsx" "frontend/src/app/doctor/patients/page.tsx" "frontend/src/app/doctor/finalize/[appointmentId]/page.tsx" "frontend/src/app/doctor/notifications/page.tsx" "frontend/src/app/notifications/page.tsx" "frontend/src/app/doctor/dashboard/page.tsx"
git commit -m "fix(datetime): pin all displayed times to Asia/Manila via shared formatter"
```

---

## Task 2: Onboarding state persistence

**Problem:** `onboarding-context.tsx` and `doctor-onboarding-context.tsx` hold all wizard state in `useState` with zero persistence. Refresh / back / deep-link to a later step wipes everything back to defaults.

**Files:**
- Modify: `frontend/src/context/onboarding-context.tsx`
- Modify: `frontend/src/context/doctor-onboarding-context.tsx`

- [ ] **Step 1: Add sessionStorage persistence to the patient context**

Rewrite `frontend/src/context/onboarding-context.tsx` so `data` lazy-initializes from `sessionStorage` and writes back on every change; `reset()` also clears the key:

```tsx
// frontend/src/context/onboarding-context.tsx
'use client';

import * as React from 'react';
import { type OnboardingData, ONBOARDING_DEFAULTS } from '@/types/patient';

interface OnboardingContextValue {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  reset: () => void;
}

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

const STORAGE_KEY = 'ginhawa.onboarding.patient';

function loadInitial(): OnboardingData {
  if (typeof window === 'undefined') return ONBOARDING_DEFAULTS;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return ONBOARDING_DEFAULTS;
    return { ...ONBOARDING_DEFAULTS, ...(JSON.parse(raw) as Partial<OnboardingData>) };
  } catch {
    return ONBOARDING_DEFAULTS;
  }
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<OnboardingData>(loadInitial);

  React.useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [data]);

  const update = React.useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = React.useCallback(() => {
    setData(ONBOARDING_DEFAULTS);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* non-fatal */
    }
  }, []);

  return (
    <OnboardingContext.Provider value={{ data, update, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within <OnboardingProvider>');
  }
  return ctx;
}
```

- [ ] **Step 2: Apply the identical pattern to the doctor context**

Rewrite `frontend/src/context/doctor-onboarding-context.tsx` the same way, using `STORAGE_KEY = 'ginhawa.onboarding.doctor'`, `DoctorOnboardingData`, `DOCTOR_ONBOARDING_DEFAULTS`, and the existing `useDoctorOnboarding` hook name. Same `loadInitial`, same persist effect, same `reset` clearing the key.

- [ ] **Step 3: Confirm submit clears storage**

Verify the submit flows already call `reset()` after a successful submit; if patient onboarding's final submit does not call `reset()`, the sessionStorage clear is the only consequence of leaving stale data, which is acceptable (it's overwritten next run). Do **not** add new reset calls unless one is trivially missing at the existing success handler. (Doctor submit at `onboarding/doctor/5/page.tsx` navigates away on success — leave as-is; data is harmless and overwritten next onboarding.)

- [ ] **Step 4: Verify**

Run (in `frontend/`): `npm run lint`
Expected: PASS.
Manual: start patient onboarding, fill step 1, refresh the page → fields remain populated; complete onboarding, start again → fields are blank.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/onboarding-context.tsx frontend/src/context/doctor-onboarding-context.tsx
git commit -m "fix(onboarding): persist wizard state to sessionStorage across refresh/back"
```

---

## Task 3: Persist doctor PRC license fields

**Problem:** The onboarding submit (`POST /doctors/profile` → `upsertProfile`) builds `profileData` that omits `prcLicenseNo`, `prcLicenseExpiry`, `ptrNo`, `region`, `city` — so the license the doctor enters is silently dropped. Separately, both PRC-expiry DatePickers set `minDate={localTodayISO()}`, blocking entry of an already-expired (historical) license. `prcLicenseExpiry` arrives as a date-only string but the Prisma column is `DateTime`, so it must be coerced to a `Date`. No verification logic is added — the flow still completes.

**Files:**
- Modify: `backend/src/doctors/doctors.service.ts` (`upsertProfile`, and `update` for expiry coercion)
- Test: `backend/src/doctors/doctors.service.spec.ts`
- Modify: `frontend/src/app/doctor/profile/page.tsx` (remove `minDate` + unused import)
- Modify: `frontend/src/app/onboarding/doctor/5/page.tsx` (remove `minDate` + unused import)

- [ ] **Step 1: Update the existing failing test to expect the PRC fields**

In `backend/src/doctors/doctors.service.spec.ts`, the test `'should create or return existing profile and set profileComplete'` (≈ line 100) asserts an exact `profileData` object. Add the five new keys so it expects them:

```ts
      const profileData = {
        fullName: dto.fullName,
        professionalTitle: dto.professionalTitle,
        specialization: dto.specialization,
        bio: dto.bio,
        yearsOfExperience: undefined,
        consultationFee: undefined,
        languagesSpoken: undefined,
        consultationFocusAreas: undefined,
        availabilitySummary: undefined,
        profilePictureUrl: undefined,
        prcLicenseNo: undefined,
        prcLicenseExpiry: undefined,
        ptrNo: undefined,
        region: undefined,
        city: undefined,
      };
```

- [ ] **Step 2: Add a focused test that PRC values are persisted (with date coercion)**

Add inside the `describe('upsertProfile', ...)` block:

```ts
    it('persists PRC license fields and coerces expiry to a Date', async () => {
      const userId = 'user-1';
      const dto = {
        fullName: 'Dr. John',
        professionalTitle: 'MD',
        specialization: 'General',
        prcLicenseNo: '1234567',
        prcLicenseExpiry: '2027-05-30',
        ptrNo: '12345678',
        region: 'NCR',
        city: 'Makati',
      };

      await service.upsertProfile(userId, dto);

      expect(mockUpsertTx.doctorProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            prcLicenseNo: '1234567',
            prcLicenseExpiry: new Date('2027-05-30'),
            ptrNo: '12345678',
            region: 'NCR',
            city: 'Makati',
          }),
        }),
      );
    });
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run (in `backend/`): `npm test -- doctors.service`
Expected: FAIL — the existing test fails (actual `profileData` lacks the new keys) and the new test fails (`prcLicenseNo` etc. not present in the upsert call).

- [ ] **Step 4: Add the fields to `upsertProfile` and coerce expiry**

In `backend/src/doctors/doctors.service.ts`, extend `profileData` (the object at ≈ line 31):

```ts
    const profileData = {
      fullName: dto.fullName,
      professionalTitle: dto.professionalTitle,
      specialization: dto.specialization,
      bio: dto.bio,
      yearsOfExperience: dto.yearsOfExperience,
      consultationFee: dto.consultationFee,
      languagesSpoken: dto.languagesSpoken,
      consultationFocusAreas: dto.consultationFocusAreas,
      availabilitySummary: dto.availabilitySummary,
      profilePictureUrl: dto.profilePictureUrl,
      prcLicenseNo: dto.prcLicenseNo,
      prcLicenseExpiry: dto.prcLicenseExpiry ? new Date(dto.prcLicenseExpiry) : undefined,
      ptrNo: dto.ptrNo,
      region: dto.region,
      city: dto.city,
    };
```

- [ ] **Step 5: Coerce expiry in the edit path too (prevent a Prisma runtime error)**

The PATCH edit path (`update`) spreads `data` straight into `prisma.doctorProfile.update`. A date-only `prcLicenseExpiry` string would make Prisma throw. Coerce it. Replace the `update` method body (≈ line 92):

```ts
  async update(userId: string, data: UpdateDoctorDto) {
    const profile = await this.findByUserId(userId);
    const updateData =
      data.prcLicenseExpiry !== undefined
        ? { ...data, prcLicenseExpiry: data.prcLicenseExpiry ? new Date(data.prcLicenseExpiry) : null }
        : data;
    return this.prisma.$transaction(async (tx) => {
      const saved = await tx.doctorProfile.update({
        where: { id: profile.id },
        data: updateData,
      });
      if (data.specialization) {
        await this.syncPrimarySpecialization(tx, saved.id, data.specialization);
      }
      return saved;
    });
  }
```

(The existing `update` tests pass DTOs without `prcLicenseExpiry`, so `updateData === data` and `data: updateDto` assertions still hold.)

- [ ] **Step 6: Run the tests to confirm they pass**

Run (in `backend/`): `npm test -- doctors.service`
Expected: PASS (all `DoctorsService` tests green).

- [ ] **Step 7: Remove the past-date block on both PRC-expiry pickers**

In `frontend/src/app/doctor/profile/page.tsx` line ≈ 208, remove the `minDate={localTodayISO()}` prop:

```tsx
                  <DatePicker id="d-prcExpiry" value={prcLicenseExpiry} onChange={setPrcLicenseExpiry} />
```

`localTodayISO` is now unused in this file → remove its import (line ≈ 15: `import { localTodayISO } from "@/lib/schemas/onboarding.schemas";`).

In `frontend/src/app/onboarding/doctor/5/page.tsx` line ≈ 140, remove `minDate={localTodayISO()}`:

```tsx
            render={(d, set) => <DatePicker value={d.prcLicenseExpiry} onChange={(v) => set('prcLicenseExpiry', v)} />} />
```

`localTodayISO` is now unused in this file → remove its import (line ≈ 11).

- [ ] **Step 8: Verify frontend**

Run (in `frontend/`): `npm run lint`
Expected: PASS (no unused `localTodayISO`).

- [ ] **Step 9: Commit**

```bash
git add backend/src/doctors/doctors.service.ts backend/src/doctors/doctors.service.spec.ts "frontend/src/app/doctor/profile/page.tsx" "frontend/src/app/onboarding/doctor/5/page.tsx"
git commit -m "fix(doctors): persist PRC license fields and allow past expiry dates"
```

---

## Task 4: Persist & resurface symptom-check results

**Problem:** `recommendations/page.tsx` POSTs to `/recommendations` with **no Authorization header**, so the backend (which is `@OptionalJwt` and already persists when a user resolves) saves the log orphaned (`patientId: null`). The result is shown with a fabricated `temp-` id and never added to the visible history, so it appears to vanish. Backend is correct — fix is frontend-only.

**Files:**
- Modify: `frontend/src/app/recommendations/page.tsx`

- [ ] **Step 1: Extract a reusable history loader**

In `RecommendationsContent`, replace the inline history effect (≈ lines 53-58) with a `useCallback` so it can be re-run after a new analysis:

```tsx
  const loadHistory = React.useCallback(() => {
    if (!token) return;
    apiRequest<RecommendationLog[]>("/recommendations", { token })
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);
```

(Add `import * as React` is already present via `import React, { useState, useEffect } from "react";` — use `React.useCallback`.)

- [ ] **Step 2: Send the auth header on the POST**

In `handleAnalyze`, add the Authorization header when a token exists (≈ line 75):

```tsx
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ symptomInput: symptoms }),
      });
```

- [ ] **Step 3: Refetch history after a successful analysis**

Immediately after `setResult(completeLog);` (≈ line 116), refresh the persisted list so the new check appears with its real id:

```tsx
      setResult(completeLog);
      if (token) loadHistory();
```

- [ ] **Step 4: Verify**

Run (in `frontend/`): `npm run lint`
Expected: PASS.
Manual (logged-in patient): run a symptom check → after the result renders, it appears under "Your past symptom checks" without a manual reload, and survives a page refresh.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/recommendations/page.tsx"
git commit -m "fix(recommendations): authenticate symptom-check POST and refresh history"
```

---

## Task 5: Doctor dashboard error state

**Problem:** `doctor-dashboard-client.tsx` (≈ lines 42-46) catches a load failure with only `console.error`, then renders `0 / 0 / "No appointments today"` — a flaky network makes the doctor believe their day is empty.

**Files:**
- Modify: `frontend/src/app/doctor/dashboard/doctor-dashboard-client.tsx`

- [ ] **Step 1: Add error state and make the fetch retryable**

Replace the data-loading block (≈ lines 32-50) so `fetchData` is callable from a Retry button and sets an `error` flag:

```tsx
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = React.useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(false);
      const data = await apiRequest<Appointment[]>("/appointments/doctor", { token });
      setAppointments(data);
    } catch (err) {
      console.error("Failed to load doctor dashboard data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
```

Ensure `React` is imported for `React.useCallback` (the file already does `import React, { useEffect, useState } from "react";`).

- [ ] **Step 2: Render an error + Retry block before the dashboard body**

Immediately after the `if (loading) { ... }` block (≈ line 77), add:

```tsx
  if (error) {
    return (
      <DashboardLayout role="doctor">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-xl font-bold font-serif text-text-primary mb-2">
            Couldn&apos;t load your dashboard
          </h2>
          <p className="text-on-surface-variant mb-6">
            We couldn&apos;t reach the server. Your appointments may not be shown.
          </p>
          <Button onClick={() => fetchData()}>Try Again</Button>
        </div>
      </DashboardLayout>
    );
  }
```

Add `import { Button } from "@/components/ui/button";` if not already imported.

- [ ] **Step 3: Verify**

Run (in `frontend/`): `npm run lint`
Expected: PASS.
Manual: with the backend stopped, load `/doctor/dashboard` → see the error + "Try Again" (not a 0/0 empty state); start backend, click Try Again → dashboard loads.

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/doctor/dashboard/doctor-dashboard-client.tsx"
git commit -m "fix(doctor-dashboard): show error + retry instead of false empty state"
```

---

## Task 6: Join button visibility — polling + countdown

**Problem:** The Join button only renders inside the 15-min window computed at render time, with no countdown and no auto-refresh. The lists fetch once on mount, so on the day-of, Join may never appear without a manual reload.

**Files:**
- Modify: `frontend/src/app/appointments/page.tsx` (patient — add polling)
- Modify: `frontend/src/app/doctor/appointments/page.tsx` (doctor — add polling)
- Modify: `frontend/src/components/appointment-card.tsx` (countdown + a ticking clock that re-evaluates the join window)

- [ ] **Step 1: Poll the patient appointments list**

In `frontend/src/app/appointments/page.tsx`, add a 30s polling effect after the existing fetch effect (≈ line 48):

```tsx
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      fetchAppointments();
    }, 30_000);
    return () => clearInterval(id);
  }, [token, fetchAppointments]);
```

- [ ] **Step 2: Poll the doctor appointments list**

In `frontend/src/app/doctor/appointments/page.tsx`, add after the existing fetch effect (≈ line 37):

```tsx
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      fetchAppointments();
    }, 30_000);
    return () => clearInterval(id);
  }, [token]);
```

(`fetchAppointments` here is a hoisted function declaration; the existing file already disables exhaustive-deps for its fetch effect, so this is consistent. Add `// eslint-disable-next-line react-hooks/exhaustive-deps` above the closing `}, [token]);` if lint flags the missing dep.)

- [ ] **Step 3: Add a ticking clock to the appointment card**

In `frontend/src/components/appointment-card.tsx`, the join-window check is computed at render from `Date.now()`. Add a 30s tick inside `AppointmentCard` so it re-evaluates without depending on the list refetch. After the existing `useState` (≈ line 61):

```tsx
  const [, setTick] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
```

Add `useEffect` to the React import at the top: `import React, { useState, useEffect } from "react";`.

- [ ] **Step 4: Show a "Join opens at …" hint for confirmed, not-yet-joinable appointments (patient)**

In the patient branch Actions area, just before the `{appt.status === "CONFIRMED" && isWithinJoinWindow(appt) && (...)}` Join button (≈ line 169), add a hint shown when confirmed but the window has not opened yet:

```tsx
                      {appt.status === "CONFIRMED" && !isWithinJoinWindow(appt) && slot && Date.now() < new Date(slot.startTime).getTime() && (
                        <span className="text-xs font-semibold text-on-surface-variant self-center">
                          Join opens at {formatPHTime(slot.startTime)} PHT
                        </span>
                      )}
```

This requires `formatPHTime` (imported in Task 1). If Task 1 has not yet run in this branch, add `import { formatPHTime } from '@/lib/datetime';`.

- [ ] **Step 5: Verify**

Run (in `frontend/`): `npm run lint`
Expected: PASS.
Manual: as a patient with a CONFIRMED appointment later today, the card shows "Join opens at H:MM PM PHT"; within 15 min of start (without reloading) the Join button appears.

- [ ] **Step 6: Commit**

```bash
git add "frontend/src/app/appointments/page.tsx" "frontend/src/app/doctor/appointments/page.tsx" frontend/src/components/appointment-card.tsx
git commit -m "fix(appointments): poll lists and show join countdown so Join surfaces reliably"
```

---

## Task 7: Consultation call resilience (reconnecting + manual return)

**Problem:** `consultation/[appointmentId]/page.tsx` ejects the patient (`router.push('/appointments')`) on **any** `participant-left` event, so a transient doctor disconnect drops the patient mid-call. A clean end signal already exists: the doctor's "End & Finalize" sends a `call-ended` app-message that the patient already handles.

**Approach (chosen):** On `participant-left`, show a non-blocking "Doctor disconnected — reconnecting…" overlay; dismiss on `participant-joined`; after 60s with no rejoin, swap to a "Return to appointments" button (manual, never auto-eject). Auto-leave only on `call-ended`.

**Files:**
- Modify: `frontend/src/app/consultation/[appointmentId]/page.tsx`

- [ ] **Step 1: Add patient-side reconnect state and a timeout ref**

After the existing refs (≈ line 40), add:

```tsx
  const [doctorDisconnected, setDoctorDisconnected] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 2: Replace the participant-left handler and add participant-joined**

In the call-frame effect (≈ lines 63-86), replace the `handleParticipantLeft` immediate redirect with reconnect handling, and add a `participant-joined` handler:

```tsx
    const handleAppMessage = (event: DailyEventObjectAppMessage) => {
      if (event.data?.type === 'call-ended') {
        router.push('/appointments');
      }
    };
    const handleParticipantLeft = () => {
      // Doctor dropped — could be a transient network blip. Show reconnecting
      // UI instead of ejecting; only an explicit 'call-ended' leaves the call.
      setDoctorDisconnected(true);
      setShowReturn(false);
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
      returnTimerRef.current = setTimeout(() => setShowReturn(true), 60_000);
    };
    const handleParticipantJoined = () => {
      setDoctorDisconnected(false);
      setShowReturn(false);
      if (returnTimerRef.current) {
        clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }
    };
    if (!isDoctor) {
      callFrame.on('app-message', handleAppMessage);
      callFrame.on('participant-left', handleParticipantLeft);
      callFrame.on('participant-joined', handleParticipantJoined);
    }
```

Update the cleanup return to remove the new listener and clear the timer:

```tsx
    return () => {
      if (!isDoctor) {
        callFrame.off('app-message', handleAppMessage);
        callFrame.off('participant-left', handleParticipantLeft);
        callFrame.off('participant-joined', handleParticipantJoined);
      }
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
      callFrame.destroy();
      callFrameRef.current = null;
      hasJoinedRef.current = false;
    };
```

- [ ] **Step 3: Render the reconnecting overlay (patient only)**

Inside the patient video container (the `<div className={isDoctor ? "flex-1" : "w-full"}>` block, ≈ line 133), add an absolutely-positioned overlay above the Daily frame. Wrap the container so the overlay can position over it:

```tsx
      <div className={isDoctor ? "flex-1 relative" : "w-full relative"}>
        <div ref={containerRef} className="w-full h-full" />
        {!isDoctor && doctorDisconnected && (
          <div className="absolute inset-x-0 top-0 z-20 flex justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto bg-surface-white/95 shadow-lifted rounded-xl px-5 py-4 max-w-sm text-center space-y-3">
              <p className="text-sm font-semibold text-text-primary">
                Doctor disconnected — reconnecting…
              </p>
              {showReturn && (
                <button
                  onClick={() => router.push('/appointments')}
                  className="text-sm font-medium text-white bg-[#31a795] hover:bg-[#006b5e] rounded-md px-4 py-2 transition-colors"
                >
                  Return to appointments
                </button>
              )}
            </div>
          </div>
        )}
      </div>
```

- [ ] **Step 4: Verify**

Run (in `frontend/`): `npm run lint`
Expected: PASS.
Manual: join as patient with a doctor present; have the doctor close their tab (without "End & Finalize") → patient sees "reconnecting…" and stays in the call; doctor rejoins → overlay clears; if doctor stays gone 60s → "Return to appointments" appears. Doctor clicking "End & Finalize" still redirects the patient immediately.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/consultation/[appointmentId]/page.tsx"
git commit -m "fix(consultation): keep patient in call on transient doctor drop, manual return after 60s"
```

---

## Task 8: Full verification & scaffolding cleanup

Runs only after Tasks 1-7 are committed and reviewed.

- [ ] **Step 1: Backend test + typecheck**

Run (in `backend/`): `npm test` then `npm run build`
Expected: all Jest suites PASS; `nest build` completes with no type errors.

- [ ] **Step 2: Frontend lint + build (typecheck)**

Run (in `frontend/`): `npm run lint` then `npm run build`
Expected: lint clean; `next build` completes with no type errors.

- [ ] **Step 3: Delete the spec and plan scaffolding (per user instruction — only after the above pass)**

```bash
git rm "docs/superpowers/specs/2026-05-30-reliability-fixes-design.md" "docs/superpowers/plans/2026-05-30-reliability-fixes.md"
git commit -m "chore: remove reliability-fixes spec and plan after execution"
```

---

## Self-review checklist (completed by author)

- **Spec coverage:** Onboarding persistence → Task 2. PRC persistence + expiry → Task 3. Symptom-check persistence → Task 4. Dashboard error state → Task 5. Timezone → Task 1. Join visibility → Task 6. Call resilience → Task 7. All seven spec items mapped.
- **Out of scope confirmed absent:** no camera/mic UX, no Privacy/Terms, no ratings, no design-token work, no Slice-2 items.
- **Type consistency:** `formatPHTime`/`formatPHDate` used as defined in Task 1; `fetchData`/`fetchAppointments`/`loadHistory` callback names consistent within each task; `doctorDisconnected`/`showReturn`/`returnTimerRef` consistent in Task 7.
- **No placeholders:** every code step shows complete code; the only "find by grep" step (Task 1 Step 3) provides an exact transformation rule plus the enumerated file list.
