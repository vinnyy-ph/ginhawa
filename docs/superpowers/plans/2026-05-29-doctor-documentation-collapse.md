# Doctor Documentation Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the three overlapping doctor post-consult documentation surfaces into one canonical surface (`/doctor/finalize/[appointmentId]`), removing the dual "Add Notes" / "Mark Complete" buttons.

**Architecture:** Make the finalize page state-aware: it fetches the appointment + any existing medical record before any AI call. If a record exists it renders read-only (folding in the old notes page's view); otherwise it AI-prefills, lets the doctor edit, and publishes (record + COMPLETED status). The appointment card collapses to one button per state. The redundant `/doctor/notes` route is deleted.

**Tech Stack:** Next.js (App Router, version differs from training — see `frontend/AGENTS.md`), React client components, next-auth, Tailwind, `@radix-ui/react-icons`. No backend changes. No frontend unit-test infra — verification is `npx tsc --noEmit`, `npm run build`, `npm run lint`.

**Working dir for all commands:** `/home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend`

**Pre-existing lint errors** in `src/app/doctor/patients/[id]/page.tsx` and `src/app/doctor/patients/page.tsx` ("Cannot access variable before declared") are unrelated — leave them.

---

### Task 1: Rewrite finalize page as the single state-aware surface

**Files:**
- Modify (full rewrite): `src/app/doctor/finalize/[appointmentId]/page.tsx`

What changes vs. current: add appointment fetch + existing-record guard before the AI `summarize` call; add a patient context header; render a read-only view when a record already exists; on summarize failure fall back to an empty editable form (instead of a full-page error that hides the form). Publish logic (`POST /medical-records` + `PATCH /appointments/:id/status COMPLETED`) is unchanged.

- [ ] **Step 1: Replace the entire file contents**

```tsx
"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeftIcon,
  CalendarIcon,
  PersonIcon,
  CheckCircledIcon,
  ChatBubbleIcon,
  HeartIcon,
  FileTextIcon,
  ExclamationTriangleIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import type { Appointment, MedicalRecord } from "@/types/api";

interface AiSummary {
  doctorSummary: string;
  patientSummary: string;
  prescriptions: string;
  followUp: string;
}

export default function FinalizeConsultationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const resolvedParams = use(params);
  const appointmentId = resolvedParams.appointmentId;
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [existingRecord, setExistingRecord] = useState<MedicalRecord | null>(null);

  // AI summarize (only runs when no record exists yet)
  const [summarizing, setSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  const [doctorSummary, setDoctorSummary] = useState('');
  const [patientSummary, setPatientSummary] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [followUp, setFollowUp] = useState('');

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function runSummarize() {
    if (!token) return;
    setSummarizing(true);
    setSummarizeError(null);
    try {
      const data = await apiRequest<AiSummary>(`/consultation/${appointmentId}/summarize`, {
        method: 'POST',
        token,
      });
      setDoctorSummary(data.doctorSummary);
      setPatientSummary(data.patientSummary);
      setPrescriptions(data.prescriptions);
      setFollowUp(data.followUp);
    } catch {
      setSummarizeError('AI summarization failed. Write the record manually below, or try again.');
    } finally {
      setSummarizing(false);
    }
  }

  useEffect(() => {
    async function init() {
      if (!token) return;
      setLoading(true);
      setError(null);

      // 1. Appointment context
      try {
        const appt = await apiRequest<Appointment>(`/appointments/${appointmentId}`, { token });
        setAppointment(appt);
      } catch {
        setError("Appointment not found or you don't have permission to view it.");
        setLoading(false);
        return;
      }

      // 2. Existing-record guard — runs BEFORE any AI call
      let record: MedicalRecord | undefined;
      try {
        const records = await apiRequest<MedicalRecord[]>("/medical-records/doctor", { token });
        record = records.find(r => r.appointmentId === appointmentId);
      } catch {
        // non-fatal: treat as no record
      }

      if (record) {
        setExistingRecord(record);
        setLoading(false);
        return;
      }

      // 3. No record yet → AI prefill for editable form
      setLoading(false);
      runSummarize();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, appointmentId]);

  async function handlePublish() {
    if (!token) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      await apiRequest('/medical-records', {
        method: 'POST',
        token,
        body: {
          appointmentId,
          notes: doctorSummary.trim() || undefined,
          prescription: prescriptions.trim() || undefined,
          recommendations: patientSummary.trim() || undefined,
          followUpAdvice: followUp.trim() || undefined,
        },
      });
      await apiRequest(`/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        token,
        body: { status: 'COMPLETED' },
      });
      setPublishSuccess(true);
      setTimeout(() => router.push('/doctor/appointments'), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish record.';
      setPublishError(msg);
    } finally {
      setIsPublishing(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="doctor">
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  if (error || !appointment) {
    return (
      <DashboardLayout role="doctor">
        <div className="bg-red-50 text-error p-6 rounded-lg border border-red-100 text-center max-w-lg mx-auto mt-10">
          <ExclamationTriangleIcon className="w-10 h-10 mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Error Loading Data</h3>
          <p>{error}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/doctor/appointments">Back to Appointments</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isReadOnly = !!existingRecord;
  const pat = appointment.patient;
  const slot = appointment.slot;
  const dateStr = slot
    ? new Date(slot.startTime).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown Date';

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500">

        {publishSuccess && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-success text-white px-6 py-3 rounded-lg shadow-lifted flex items-center gap-3">
              <CheckCircledIcon className="w-5 h-5" />
              <span className="font-medium">Record published! Redirecting...</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <Link href="/doctor/appointments" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-4">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Appointments
          </Link>
          <div className="flex items-center gap-3">
            <MagicWandIcon className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold font-serif text-text-primary">
              {isReadOnly ? "Medical Record" : "Finalize Consultation"}
            </h1>
          </div>
          {!isReadOnly && (
            <p className="text-sm text-on-surface-variant mt-1 ml-9">Review and edit the AI-generated summaries before publishing.</p>
          )}
        </div>

        {/* Context header */}
        <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-5 mb-6 flex flex-col md:flex-row gap-5 items-start">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-text-primary font-serif font-bold text-xl shrink-0">
            {pat?.fullName.charAt(0) || 'P'}
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Patient</p>
              <h3 className="font-bold text-text-primary flex items-center gap-2">
                <PersonIcon className="w-4 h-4 text-on-surface-variant" />
                {pat?.fullName || 'Unknown Patient'}
              </h3>
            </div>
            <div>
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Consultation Date</p>
              <p className="font-medium flex items-center gap-2 text-text-primary">
                <CalendarIcon className="w-4 h-4 text-primary" />
                {dateStr}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Reason for Visit</p>
              <p className="text-sm text-on-surface-variant bg-surface p-3 rounded-lg">
                {appointment.reasonForVisit || "No reason provided."}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        {isReadOnly ? (
          <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
            <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30">
              <h3 className="font-serif text-lg font-bold text-text-primary">Clinical Documentation</h3>
              <p className="text-sm text-on-surface-variant mt-1">This record is published and read-only.</p>
            </div>
            <div className="p-6 space-y-8">
              {existingRecord!.notes && (
                <div>
                  <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                    <ChatBubbleIcon className="w-4 h-4 text-primary" /> Consultation Notes
                  </h4>
                  <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
                    {existingRecord!.notes}
                  </div>
                </div>
              )}
              {existingRecord!.prescription && (
                <div>
                  <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                    <HeartIcon className="w-4 h-4 text-[#ba1a1a]" /> Prescription
                  </h4>
                  <div className="bg-red-50 p-4 rounded-lg text-sm text-on-surface whitespace-pre-line leading-relaxed border border-red-100">
                    {existingRecord!.prescription}
                  </div>
                </div>
              )}
              {existingRecord!.recommendations && (
                <div>
                  <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                    <FileTextIcon className="w-4 h-4 text-info" /> Recommendations
                  </h4>
                  <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
                    {existingRecord!.recommendations}
                  </div>
                </div>
              )}
              {existingRecord!.followUpAdvice && (
                <div>
                  <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                    <CheckCircledIcon className="w-4 h-4 text-primary" /> Follow-up Advice
                  </h4>
                  <div className="bg-primary/5 p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed border border-primary/10">
                    {existingRecord!.followUpAdvice}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : summarizing ? (
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-on-surface-variant">Generating AI summaries...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {summarizeError && (
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm border border-yellow-200 flex items-center justify-between gap-3">
                <span>{summarizeError}</span>
                <Button onClick={runSummarize} variant="outline" size="sm">Try Again</Button>
              </div>
            )}

            {publishError && (
              <div className="bg-red-50 text-error p-3 rounded-lg text-sm border border-red-100">
                {publishError}
              </div>
            )}

            <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
              <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30">
                <h3 className="font-serif text-lg font-bold text-text-primary">Clinical Documentation</h3>
                <p className="text-xs text-on-surface-variant mt-1">Edit as needed before publishing to the patient record.</p>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Doctor Summary (Clinical)</label>
                  <textarea
                    value={doctorSummary}
                    onChange={e => setDoctorSummary(e.target.value)}
                    rows={5}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Patient Summary (Plain Language)</label>
                  <textarea
                    value={patientSummary}
                    onChange={e => setPatientSummary(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Prescriptions</label>
                  <textarea
                    value={prescriptions}
                    onChange={e => setPrescriptions(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Follow-up Recommendations</label>
                  <textarea
                    value={followUp}
                    onChange={e => setFollowUp(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pb-8">
              <Button variant="outline" asChild>
                <Link href="/doctor/appointments">Cancel</Link>
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing || publishSuccess}
                className="min-w-[160px] bg-[#31a795] text-white hover:bg-[#006b5e]"
              >
                {isPublishing ? 'Publishing...' : 'Publish to Patient Record'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `src/app/doctor/finalize/[appointmentId]/page.tsx`. (Pre-existing `doctor/patients` errors may still appear — ignore.)

- [ ] **Step 3: Commit**

```bash
git add src/app/doctor/finalize/[appointmentId]/page.tsx
git commit -m "feat(doctor): make finalize the single state-aware documentation surface"
```

---

### Task 2: Collapse appointment-card buttons to one per state

**Files:**
- Modify: `src/components/appointment-card.tsx` (doctor role footer, the `CONFIRMED` and `COMPLETED` blocks)

- [ ] **Step 1: Replace the "Add Notes" + "Mark Complete" buttons in the CONFIRMED block**

Find this block (inside `appt.status === "CONFIRMED"`, after the Join Consultation button):

```tsx
              {appt.id && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/doctor/notes/${appt.id}`}>Add Notes</Link>
                </Button>
              )}
              <Button size="sm" asChild variant="outline">
                <Link href={`/doctor/finalize/${appt.id}`}>Mark Complete</Link>
              </Button>
```

Replace with:

```tsx
              {appt.id && (
                <Button size="sm" asChild variant="outline">
                  <Link href={`/doctor/finalize/${appt.id}`}>Complete &amp; Document</Link>
                </Button>
              )}
```

- [ ] **Step 2: Repoint the COMPLETED block to finalize (read-only view)**

Find:

```tsx
          {appt.status === "COMPLETED" && appt.id && (
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
              <Link href={`/doctor/notes/${appt.id}`}>View / Edit Notes</Link>
            </Button>
          )}
```

Replace with:

```tsx
          {appt.status === "COMPLETED" && appt.id && (
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
              <Link href={`/doctor/finalize/${appt.id}`}>View Record</Link>
            </Button>
          )}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `src/components/appointment-card.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/appointment-card.tsx
git commit -m "feat(doctor): collapse appointment-card to single documentation button"
```

---

### Task 3: Delete the redundant `/doctor/notes` route and repoint stray links

**Files:**
- Delete: `src/app/doctor/notes/[appointmentId]/page.tsx` (and now-empty `src/app/doctor/notes/[appointmentId]/` and `src/app/doctor/notes/` dirs)

- [ ] **Step 1: Find any remaining references to `/doctor/notes`**

Run: `grep -rn "doctor/notes" src/`
Expected: after Task 2, the only matches should be inside `src/app/doctor/notes/[appointmentId]/page.tsx` itself (self-references / the file being deleted). If any OTHER file still links to `/doctor/notes`, repoint that link to `/doctor/finalize/<same-id-expression>` using the same pattern as the card edits in Task 2, then re-run the grep.

- [ ] **Step 2: Delete the route file and empty dirs**

Run:
```bash
git rm src/app/doctor/notes/[appointmentId]/page.tsx
rmdir src/app/doctor/notes/[appointmentId] src/app/doctor/notes 2>/dev/null || true
```
Expected: file staged for deletion; dirs removed if empty.

- [ ] **Step 3: Verify no references remain**

Run: `grep -rn "doctor/notes" src/`
Expected: no output.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (no broken imports from the deletion).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(doctor): delete redundant /doctor/notes route"
```

---

### Task 4: Full build + lint verification

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds; route list no longer contains `/doctor/notes/[appointmentId]`; still contains `/doctor/finalize/[appointmentId]`.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: only the two known pre-existing errors in `src/app/doctor/patients/[id]/page.tsx` and `src/app/doctor/patients/page.tsx`. No new errors from the touched files.

- [ ] **Step 3: Manual flow sanity check (read-through, no code)**

Confirm against the diff:
- CONFIRMED card shows exactly: Cancel, Join Consultation, "Complete & Document".
- "Complete & Document" → finalize → (no record) AI summarize → edit → Publish → COMPLETED.
- COMPLETED card shows "View Record" → finalize → existing-record guard hits → read-only view, no summarize call, no publish button.
- In-call "End & Finalize" still routes to `/doctor/finalize/:id` (unchanged in `consultation/[appointmentId]/page.tsx`).
```
