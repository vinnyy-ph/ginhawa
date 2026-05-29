# Demo-Readiness Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 9 remaining review issues so the patient → doctor → consultation → record demo path works end-to-end (booking redirect, reschedule, join time-gate, copy, consult exit, record deep-link, naming, doctor signup nav).

**Architecture:** Frontend-only changes (the reschedule backend already exists and is tested). Surgical edits to existing components/pages plus one new component (`reschedule-dialog.tsx`) built on the already-installed `@radix-ui/react-dialog`.

**Tech Stack:** Next.js (App Router, "use client" components), React, TypeScript, Tailwind, `@radix-ui/react-dialog`, `@daily-co/daily-js`, NextAuth session for `accessToken`.

**Working directory:** All paths are relative to `frontend/`. Run all commands from `frontend/`.

**Verification model:** No frontend test runner exists (scripts: dev/build/start/lint). Per-task check = `npx tsc --noEmit` (type-check). Final gate = `npm run build` + `npm run lint`. No TDD steps (no runner); each task is edit → type-check → commit.

**Shared-file note:** `src/components/appointment-card.tsx` is touched by Tasks 2, 4, and 5. Execute in order; each task re-reads the current file.

---

### Task 1: Booking happy-path — redirect + copy (#1, #5)

**Files:**
- Modify: `src/components/booking/doctor-booking-panel.tsx`

- [ ] **Step 1: Fix the 404 redirect**

In `handleBookAppointment`, the success redirect points at a non-existent route. Change line ~34:

```tsx
// BEFORE
setTimeout(() => router.push("/dashboard/appointments"), 1500);
// AFTER
setTimeout(() => router.push("/appointments"), 1500);
```

- [ ] **Step 2: Fix the misleading success copy**

The booking POST creates a `PENDING` appointment (needs doctor confirmation), not a locked booking. Change the toast text (line ~52):

```tsx
// BEFORE
<span className="font-medium">Appointment booked! Redirecting…</span>
// AFTER
<span className="font-medium">Request sent — your doctor will confirm shortly.</span>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/booking/doctor-booking-panel.tsx
git commit -m "fix(booking): redirect to /appointments and set accurate pending copy"
```

---

### Task 2: Join time-gate + action ordering (#3, #9)

**Files:**
- Modify: `src/components/appointment-card.tsx`

- [ ] **Step 1: Implement the real join window**

Replace the stub function (lines ~24-30, including the `//always return true for now` comment) with real time-gating:

```tsx
function isWithinJoinWindow(appt: Appointment): boolean {
  if (!appt.slot) return false;
  const now = Date.now();
  const start = new Date(appt.slot.startTime).getTime();
  const end = new Date(appt.slot.endTime).getTime();
  // Joinable from 15 minutes before start until the slot end time.
  return now >= start - 15 * 60 * 1000 && now <= end;
}
```

- [ ] **Step 2: Gate the doctor "Complete & Document" button on consult start (#9)**

In the doctor CONFIRMED branch, the "Complete & Document" button currently always renders. Gate it so it only appears once the slot has started (prevents AI-summarizing empty notes pre-consult). Change the block (around lines ~292-296):

```tsx
// BEFORE
{appt.id && (
  <Button size="sm" asChild variant="outline">
    <Link href={`/doctor/finalize/${appt.id}`}>Complete &amp; Document</Link>
  </Button>
)}
// AFTER
{appt.id && slot && Date.now() >= new Date(slot.startTime).getTime() && (
  <Button size="sm" asChild variant="outline">
    <Link href={`/doctor/finalize/${appt.id}`}>Complete &amp; Document</Link>
  </Button>
)}
```

(`slot` is already destructured as `const slot = appt.slot;` at the top of the component.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/appointment-card.tsx
git commit -m "fix(appointments): real join window and gate Complete&Document on consult start"
```

---

### Task 3: Reschedule dialog component (#2, part 1)

**Files:**
- Create: `src/components/booking/reschedule-dialog.tsx`

Uses the already-installed `@radix-ui/react-dialog`. Reuses the existing `SlotPicker`. Fetches the appointment's doctor's slots, filters to future `AVAILABLE`, and POSTs to the existing reschedule endpoint.

- [ ] **Step 1: Create the component**

Create `src/components/booking/reschedule-dialog.tsx`:

```tsx
"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SlotPicker } from "@/components/booking/slot-picker";
import type { Appointment, AvailabilitySlot } from "@/types/api";

interface RescheduleDialogProps {
  appointment: Appointment;
  token?: string;
  onRescheduled: () => void;
  trigger: React.ReactNode;
}

export function RescheduleDialog({
  appointment,
  token,
  onRescheduled,
  trigger,
}: RescheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSlots() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AvailabilitySlot[]>(
        `/doctors/${appointment.doctorId}/slots`,
      );
      const now = Date.now();
      setSlots(
        data
          .filter(
            (s) => s.status === "AVAILABLE" && new Date(s.startTime).getTime() > now,
          )
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          ),
      );
    } catch {
      setError("Could not load available slots.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSelectedSlot(null);
      setError(null);
      loadSlots();
    }
  }

  async function handleConfirm() {
    if (!selectedSlot || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/appointments/${appointment.id}/reschedule`, {
        method: "POST",
        token,
        body: { newSlotId: selectedSlot.id },
      });
      setOpen(false);
      onRescheduled();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reschedule.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface-white p-6 shadow-lifted animate-in fade-in zoom-in-95 focus:outline-none">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-serif text-lg font-bold text-text-primary">
              Reschedule Appointment
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container hover:text-primary">
              <Cross2Icon className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-4 text-sm text-on-surface-variant">
            Pick a new available slot. Your appointment will be sent back to the
            doctor to confirm.
          </Dialog.Description>

          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <SlotPicker
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
              {error && <p className="mt-3 text-xs text-error">{error}</p>}
              <Button
                className="mt-4 w-full"
                disabled={!selectedSlot || submitting}
                onClick={handleConfirm}
              >
                {submitting ? "Rescheduling…" : "Confirm New Time"}
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/booking/reschedule-dialog.tsx
git commit -m "feat(reschedule): add RescheduleDialog using radix dialog + SlotPicker"
```

---

### Task 4: Wire reschedule into card + pages (#2, part 2)

**Files:**
- Modify: `src/components/appointment-card.tsx`
- Modify: `src/app/appointments/page.tsx`
- Modify: `src/app/doctor/appointments/page.tsx`

- [ ] **Step 1: Add props + import to the card**

In `src/components/appointment-card.tsx`, add the import near the other imports:

```tsx
import { RescheduleDialog } from "@/components/booking/reschedule-dialog";
```

Add two props to `AppointmentCardProps` (after `onUpdateStatus`):

```tsx
  onUpdateStatus?: (id: string, status: AppointmentStatus) => void;
  token?: string;
  onRescheduled?: () => void;
```

Destructure them in the component signature (add to the existing destructure list):

```tsx
export function AppointmentCard({
  appointment: appt,
  role,
  isExpanded = false,
  onToggleExpand,
  isUpdating = false,
  onUpdateStatus,
  token,
  onRescheduled,
}: AppointmentCardProps) {
```

- [ ] **Step 2: Replace the dead patient Reschedule button**

In the patient branch, replace the disabled button (lines ~121-123):

```tsx
// BEFORE
<Button disabled variant="outline" size="sm" className="opacity-50 cursor-not-allowed">
  Reschedule
</Button>
// AFTER
<RescheduleDialog
  appointment={appt}
  token={token}
  onRescheduled={() => onRescheduled?.()}
  trigger={
    <Button variant="outline" size="sm">
      Reschedule
    </Button>
  }
/>
```

- [ ] **Step 3: Add Reschedule to the doctor CONFIRMED branch**

In the doctor CONFIRMED block, add a reschedule trigger immediately before the Join button (before the `{appt.id && isWithinJoinWindow(appt) && (` line, ~line 287):

```tsx
<RescheduleDialog
  appointment={appt}
  token={token}
  onRescheduled={() => onRescheduled?.()}
  trigger={
    <Button variant="outline" size="sm">
      Reschedule
    </Button>
  }
/>
```

- [ ] **Step 4: Pass token + refetch from the patient page**

In `src/app/appointments/page.tsx`, update the `<AppointmentCard>` usage (around lines 143-151) to pass `token` and `onRescheduled`:

```tsx
<AppointmentCard
  key={appt.id}
  appointment={appt}
  role="patient"
  isExpanded={expandedId === appt.id}
  onToggleExpand={() => setExpandedId(expandedId === appt.id ? null : appt.id)}
  isUpdating={updatingId === appt.id}
  onUpdateStatus={updateStatus}
  token={token}
  onRescheduled={fetchAppointments}
/>
```

- [ ] **Step 5: Pass token + refetch from the doctor page**

In `src/app/doctor/appointments/page.tsx`, update the `<AppointmentCard>` usage (around lines 171-177):

```tsx
<AppointmentCard
  key={appt.id}
  appointment={appt}
  role="doctor"
  isUpdating={updatingId === appt.id}
  onUpdateStatus={updateStatus}
  token={token}
  onRescheduled={fetchAppointments}
/>
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/appointment-card.tsx src/app/appointments/page.tsx src/app/doctor/appointments/page.tsx
git commit -m "feat(reschedule): wire RescheduleDialog into patient + doctor cards"
```

---

### Task 5: Patient record deep-link (#7)

**Files:**
- Modify: `src/components/appointment-card.tsx`
- Modify: `src/app/records/page.tsx`

- [ ] **Step 1: Deep-link the patient "View Medical Record" button**

In `src/components/appointment-card.tsx`, patient COMPLETED branch (line ~163):

```tsx
// BEFORE
<Link href="/records">View Medical Record</Link>
// AFTER
<Link href={`/records?appointment=${appt.id}`}>View Medical Record</Link>
```

- [ ] **Step 2: Read the query param + highlight the matching record**

In `src/app/records/page.tsx`:

Add imports (top of file, with the existing imports):

```tsx
import React, { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
```

(Replace the existing `import React, { useEffect, useState } from "react";` line with the `useRef`/`Suspense` version above.)

`useSearchParams` requires a Suspense boundary in this Next version. Rename the current default-export component to `RecordsContent` (keep its body), and add a new default export wrapping it:

```tsx
export default function PatientRecordsPage() {
  return (
    <Suspense fallback={null}>
      <RecordsContent />
    </Suspense>
  );
}

function RecordsContent() {
  // ...existing component body (session, records state, fetch, render)...
}
```

Inside `RecordsContent`, after the existing state declarations, add:

```tsx
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("appointment");
```

After the `fetchRecords` effect, add a scroll effect:

```tsx
  useEffect(() => {
    if (!highlightId || records.length === 0) return;
    const el = document.getElementById(`record-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, records]);
```

- [ ] **Step 3: Add the id + highlight ring to each record card**

In the records `.map`, the outer wrapper `<div key={record.id} className="relative">` — change the inner card div (currently `className="bg-surface-white rounded-xl shadow-soft overflow-hidden border border-outline-variant/30 hover:shadow-lifted transition-shadow"`) to add an id and conditional highlight:

```tsx
<div
  id={`record-${record.appointmentId}`}
  className={cn(
    "bg-surface-white rounded-xl shadow-soft overflow-hidden border hover:shadow-lifted transition-shadow",
    record.appointmentId === highlightId
      ? "border-primary ring-2 ring-primary/40"
      : "border-outline-variant/30",
  )}
>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/appointment-card.tsx src/app/records/page.tsx
git commit -m "feat(records): deep-link patient record via ?appointment= and highlight"
```

---

### Task 6: Consultation exit handling (#6)

**Files:**
- Modify: `src/app/consultation/[appointmentId]/page.tsx`

- [ ] **Step 1: Import the participant-left event type**

Update the daily-js import (line ~6) to add `DailyEventObjectParticipantLeft`:

```tsx
import DailyIframe, {
  DailyCall,
  DailyEventObjectAppMessage,
  DailyEventObjectParticipantLeft,
} from "@daily-co/daily-js";
```

- [ ] **Step 2: Route patient to /appointments on call-ended and on doctor leaving**

In the call-frame effect (lines ~60-77), change the `call-ended` destination from `/records` to `/appointments`, add a `participant-left` handler (fires when the doctor leaves via the native Daily leave button or disconnect), and register/clean up both for the patient:

```tsx
    const handleAppMessage = (event: DailyEventObjectAppMessage) => {
      if (event.data?.type === 'call-ended') {
        router.push('/appointments');
      }
    };
    const handleParticipantLeft = (_event: DailyEventObjectParticipantLeft) => {
      // In a 1:1 consult, the only other participant is the doctor.
      router.push('/appointments');
    };
    if (!isDoctor) {
      callFrame.on('app-message', handleAppMessage);
      callFrame.on('participant-left', handleParticipantLeft);
    }

    return () => {
      if (!isDoctor) {
        callFrame.off('app-message', handleAppMessage);
        callFrame.off('participant-left', handleParticipantLeft);
      }
      callFrame.destroy();
      callFrameRef.current = null;
      hasJoinedRef.current = false;
    };
```

(The doctor's `handleEndAndFinalize` stays unchanged — it still sends `call-ended` then navigates to `/doctor/finalize/{id}`.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/consultation/[appointmentId]/page.tsx"
git commit -m "fix(consultation): handle doctor native leave and exit patient to /appointments"
```

---

### Task 7: Naming + doctor signup nav (#10, #11)

**Files:**
- Modify: `src/app/patient-home.tsx`
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Unify the AI feature name (#10)**

In `src/app/patient-home.tsx` (line ~152), rename the lone outlier to match the header and the rest of the app:

```tsx
// BEFORE
<h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">AI Recommendation</h3>
// AFTER
<h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">AI Symptom Checker</h3>
```

- [ ] **Step 2: Add doctor signup to the header (#11)**

In `src/components/layout/header.tsx`, the logged-out auth branch (lines ~83-88), add a doctor signup link before "Log in":

```tsx
// BEFORE
) : (
  <>
    <Button variant="ghost" size="sm" asChild><Link href="/login">Log in</Link></Button>
    <Button size="sm" asChild><Link href="/signup">Sign up</Link></Button>
  </>
)}
// AFTER
) : (
  <>
    <Link href="/signup/doctor" className="hidden lg:inline text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Sign up as a doctor</Link>
    <Button variant="ghost" size="sm" asChild><Link href="/login">Log in</Link></Button>
    <Button size="sm" asChild><Link href="/signup">Sign up</Link></Button>
  </>
)}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/patient-home.tsx src/components/layout/header.tsx
git commit -m "fix(ui): unify AI feature name and add doctor signup to header"
```

---

### Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: build completes, "Compiled successfully", 0 type/lint errors. Routes `/appointments`, `/records`, `/consultation/[appointmentId]`, `/doctor/appointments` all listed.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: If both clean, the plan is complete.** If either fails, fix the reported file and re-run before marking done.

---

## Self-Review (author checklist — completed)

- **Spec coverage:** #1 (T1), #2 (T3+T4), #3 (T2), #5 (T1), #6 (T6), #7 (T5), #9 (T2), #10 (T7), #11 (T7). #4/#8 excluded (shipped). All covered.
- **Placeholders:** none — every code step has full code.
- **Type consistency:** `RescheduleDialog` props (`appointment`, `token`, `onRescheduled`, `trigger`) defined in T3 and consumed identically in T4. `AppointmentCardProps` additions (`token`, `onRescheduled`) defined and passed from both pages. `isWithinJoinWindow(appt)` signature unchanged.
- **Reschedule role scope:** patient gets reschedule on PENDING+CONFIRMED (shared block); doctor on CONFIRMED only (doctors confirm/cancel pending requests rather than reschedule them) — intentional.
