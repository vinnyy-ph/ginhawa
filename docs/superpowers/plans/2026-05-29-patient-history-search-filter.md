# Patient History Search & Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the doctor roster search match patient name OR any keyword in a patient's consultation history (with a highlighted match snippet), and add status-chip + text-search filtering to the patient detail timeline.

**Architecture:** Backend precomputes a per-patient `searchText` blob in `findPatientsForDoctor`; the roster page filters client-side over name + searchText and renders a snippet when the match is history-only. The detail page filters its already-loaded appointments client-side via status chips and a text box. No new endpoints.

**Tech Stack:** NestJS + Prisma (backend), Next.js + React + Tailwind (frontend), Jest (backend tests).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `backend/src/appointments/appointments.service.ts` | `findPatientsForDoctor`: include medical records, build `searchText` per patient |
| `backend/src/appointments/appointments.service.spec.ts` | unit test for `searchText` construction |
| `frontend/src/types/api.ts` | add `searchText` to `DoctorPatientSummary` |
| `frontend/src/app/doctor/patients/page.tsx` | name-or-keyword filter + match snippet/highlight |
| `frontend/src/app/doctor/patients/[id]/page.tsx` | status-chip + text-search timeline filtering |

---

## Task 1: Backend — build `searchText` in `findPatientsForDoctor`

**Files:**
- Modify: `backend/src/appointments/appointments.service.ts:141-202`
- Test: `backend/src/appointments/appointments.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Add this `describe` block inside the top-level `describe('AppointmentsService', ...)` in `backend/src/appointments/appointments.service.spec.ts`, after the `reschedule` block (before the final closing `});`):

```typescript
  describe('findPatientsForDoctor', () => {
    beforeEach(() => {
      mockPrismaService.doctorProfile = { findUnique: jest.fn() } as any;
      mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1' });
    });

    it('builds searchText from reason, record notes and prescriptions', async () => {
      mockPrismaService.appointment.findMany = jest.fn().mockResolvedValue([
        {
          patientId: 'patient-1',
          patient: { id: 'patient-1', fullName: 'Maria Santos', profilePictureUrl: null },
          status: AppointmentStatus.COMPLETED,
          reasonForVisit: 'follow up',
          slot: { startTime: new Date(Date.now() - 86400000) },
          medicalRecord: {
            notes: 'patient appeared distressed',
            recommendations: 'rest',
            followUpAdvice: null,
            prescription: null,
            prescriptions: [
              { drugName: 'Paracetamol', dosage: '500mg', frequency: 'BID', instructions: 'after meals' },
            ],
          },
        },
      ]);

      const rows = await service.findPatientsForDoctor('user-doctor-1');

      expect(rows).toHaveLength(1);
      const text = rows[0].searchText.toLowerCase();
      expect(text).toContain('follow up');
      expect(text).toContain('distressed');
      expect(text).toContain('rest');
      expect(text).toContain('paracetamol');
      expect(text).toContain('after meals');
    });

    it('handles appointments with no medical record', async () => {
      mockPrismaService.appointment.findMany = jest.fn().mockResolvedValue([
        {
          patientId: 'patient-2',
          patient: { id: 'patient-2', fullName: 'Jose Cruz', profilePictureUrl: null },
          status: AppointmentStatus.PENDING,
          reasonForVisit: 'cough',
          slot: { startTime: new Date(Date.now() + 86400000) },
          medicalRecord: null,
        },
      ]);

      const rows = await service.findPatientsForDoctor('user-doctor-1');

      expect(rows[0].searchText.toLowerCase()).toContain('cough');
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest appointments.service --t findPatientsForDoctor`
Expected: FAIL — `searchText` is `undefined` (property does not exist on the returned rows yet), so `rows[0].searchText.toLowerCase()` throws.

- [ ] **Step 3: Implement `searchText`**

In `backend/src/appointments/appointments.service.ts`, in `findPatientsForDoctor`:

Change the appointment query include (currently lines ~150-158) to also pull the medical record and reason:

```typescript
    const appointments = await this.prisma.appointment.findMany({
      where: { doctorId: doctorProfile.id },
      include: {
        patient: {
          select: { id: true, fullName: true, profilePictureUrl: true },
        },
        slot: { select: { startTime: true } },
        medicalRecord: { include: { prescriptions: true } },
      },
    });
```

Add `searchText` to the row shape in the `Map` generic:

```typescript
    const map = new Map<
      string,
      {
        patient: (typeof appointments)[number]['patient'];
        totalVisits: number;
        upcomingCount: number;
        lastVisit: string | null;
        searchText: string;
      }
    >();
```

When creating a new row, initialize `searchText: ''`:

```typescript
      let row = map.get(appt.patientId);
      if (!row) {
        row = {
          patient: appt.patient,
          totalVisits: 0,
          upcomingCount: 0,
          lastVisit: null,
          searchText: '',
        };
        map.set(appt.patientId, row);
      }
```

Inside the loop, after the `row.totalVisits += 1;` line, accumulate the per-appointment text. Add this block:

```typescript
      const rec = appt.medicalRecord;
      const parts = [
        appt.reasonForVisit,
        rec?.notes,
        rec?.recommendations,
        rec?.followUpAdvice,
        rec?.prescription,
        ...(rec?.prescriptions ?? []).flatMap((rx) => [
          rx.drugName,
          rx.dosage,
          rx.frequency,
          rx.instructions,
        ]),
      ].filter((p): p is string => !!p && p.trim().length > 0);

      if (parts.length > 0) {
        row.searchText = row.searchText
          ? `${row.searchText} · ${parts.join(' · ')}`
          : parts.join(' · ');
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest appointments.service --t findPatientsForDoctor`
Expected: PASS (2 passing in the new describe block).

- [ ] **Step 5: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors (the 2 pre-existing spec errors in `patients.service.spec` are unrelated and may remain).

- [ ] **Step 6: Commit**

```bash
git add backend/src/appointments/appointments.service.ts backend/src/appointments/appointments.service.spec.ts
git commit -m "feat(appointments): add searchText blob to doctor patient roster"
```

---

## Task 2: Frontend type — add `searchText` to `DoctorPatientSummary`

**Files:**
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Add the field**

In `frontend/src/types/api.ts`, find the `DoctorPatientSummary` interface and add a `searchText` field:

```typescript
export interface DoctorPatientSummary {
  patient: {
    id: string;
    fullName: string;
    profilePictureUrl: string | null;
  };
  totalVisits: number;
  upcomingCount: number;
  lastVisit: string | null;
  searchText: string;
}
```

(Keep whatever existing fields are already declared; only add `searchText: string`. If the inline `patient` shape differs, leave it — just append `searchText: string` to the interface body.)

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(types): add searchText to DoctorPatientSummary"
```

---

## Task 3: Frontend roster — name-or-keyword filter + match snippet

**Files:**
- Modify: `frontend/src/app/doctor/patients/page.tsx`

- [ ] **Step 1: Add the snippet helper**

In `frontend/src/app/doctor/patients/page.tsx`, add this helper above the `DoctorPatientsPage` component (after imports). It returns the slice of context around a keyword, split into before/match/after for highlighting; returns `null` if the keyword is absent.

```typescript
const SNIPPET_PAD = 30;

function matchSnippet(
  searchText: string,
  query: string,
): { before: string; match: string; after: string } | null {
  const idx = searchText.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - SNIPPET_PAD);
  const end = Math.min(searchText.length, idx + query.length + SNIPPET_PAD);
  return {
    before: (start > 0 ? "…" : "") + searchText.slice(start, idx),
    match: searchText.slice(idx, idx + query.length),
    after: searchText.slice(idx + query.length, end) + (end < searchText.length ? "…" : ""),
  };
}
```

- [ ] **Step 2: Update the filter to match name OR searchText**

Replace the existing `filtered` `useMemo` (currently lines ~49-53) with one that also matches `searchText` and precomputes the snippet for history-only matches:

```typescript
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients.map(p => ({ row: p, snippet: null as ReturnType<typeof matchSnippet> }));
    return patients
      .filter(
        p =>
          p.patient.fullName.toLowerCase().includes(q) ||
          p.searchText.toLowerCase().includes(q),
      )
      .map(p => {
        const nameMatch = p.patient.fullName.toLowerCase().includes(q);
        return {
          row: p,
          snippet: nameMatch ? null : matchSnippet(p.searchText, q),
        };
      });
  }, [patients, query]);
```

- [ ] **Step 3: Update the input placeholder**

Change the search input `placeholder` (currently `"Search patients by name…"`) to:

```tsx
            placeholder="Search by name or consultation keyword…"
```

- [ ] **Step 4: Update the empty-state copy**

In the empty-state block, change the "Try a different name." line to:

```tsx
                ? "Try a different name or keyword."
```

- [ ] **Step 5: Render rows from the new shape + snippet line**

The map now iterates `{ row, snippet }`. Update the grid `.map` to destructure and key off `row.patient.id`. Change the opening of the map from `filtered.map(row => (` to:

```tsx
            {filtered.map(({ row, snippet }) => (
```

Then, inside the card `<Link>`, after the closing `</div>` of the "Last visit" footer block (just before `</Link>`), add the snippet line:

```tsx
                {snippet && (
                  <p className="text-xs text-on-surface-variant border-t border-outline/20 pt-2 line-clamp-2">
                    Matched:{" "}
                    <span className="italic">
                      {snippet.before}
                      <mark className="bg-primary/15 text-text-primary font-semibold rounded px-0.5">
                        {snippet.match}
                      </mark>
                      {snippet.after}
                    </span>
                  </p>
                )}
```

- [ ] **Step 6: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/doctor/patients/page.tsx
git commit -m "feat(patients): roster search by consultation keyword with snippet"
```

---

## Task 4: Frontend detail — status chips + text search

**Files:**
- Modify: `frontend/src/app/doctor/patients/[id]/page.tsx`

- [ ] **Step 1: Add filter state + appointment text helper**

In `frontend/src/app/doctor/patients/[id]/page.tsx`, add a helper above the page component that flattens one appointment into searchable text (mirrors the backend blob, for the detail-page text box):

```typescript
function appointmentText(appt: Appointment): string {
  const rec = appt.medicalRecord;
  return [
    appt.reasonForVisit,
    rec?.notes,
    rec?.recommendations,
    rec?.followUpAdvice,
    rec?.prescription,
    ...(rec?.prescriptions ?? []).flatMap(rx => [
      rx.drugName,
      rx.dosage,
      rx.frequency,
      rx.instructions,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
```

Inside `DoctorPatientDetailPage`, add filter state next to the existing `useState` calls:

```typescript
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
```

- [ ] **Step 2: Compute status counts and the filtered list**

After `const patient = data?.patient;`, add (guarding for null `data`):

```typescript
  const appointments = data?.appointments ?? [];

  const statusCounts = appointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const visibleAppointments = appointments.filter(a => {
    const statusOk = statusFilter === "ALL" || a.status === statusFilter;
    const q = search.trim().toLowerCase();
    const searchOk = !q || appointmentText(a).includes(q);
    return statusOk && searchOk;
  });
```

- [ ] **Step 3: Render the controls above the timeline**

Replace the existing timeline heading (currently the `<h2>` "Appointment history (...)" at lines ~210-212) and keep it but make the count reflect filtering, then add chips + a search box directly below it. Replace:

```tsx
            <h2 className="text-lg font-bold text-text-primary mb-3">
              Appointment history ({data.appointments.length})
            </h2>
```

with:

```tsx
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold text-text-primary">
                Appointment history{" "}
                {visibleAppointments.length === appointments.length
                  ? `(${appointments.length})`
                  : `(showing ${visibleAppointments.length} of ${appointments.length})`}
              </h2>
              <div className="relative w-full sm:w-64">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search visits…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline/40 bg-surface-white text-text-primary text-sm placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <FilterChip
                label="All"
                count={appointments.length}
                active={statusFilter === "ALL"}
                onClick={() => setStatusFilter("ALL")}
              />
              {(Object.keys(statusCounts) as AppointmentStatus[]).map(s => (
                <FilterChip
                  key={s}
                  label={s.charAt(0) + s.slice(1).toLowerCase()}
                  count={statusCounts[s]}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                />
              ))}
            </div>
```

Add `MagnifyingGlassIcon` to the existing `@radix-ui/react-icons` import:

```tsx
import { ChevronLeftIcon, FileTextIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
```

- [ ] **Step 4: Add the `FilterChip` component**

Add above `DoctorPatientDetailPage`:

```tsx
function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm rounded-full px-3 py-1 border transition-colors ${
        active
          ? "bg-primary text-on-primary border-primary"
          : "bg-surface-white text-on-surface-variant border-outline/40 hover:border-primary/50"
      }`}
    >
      {label} <span className="font-semibold">{count}</span>
    </button>
  );
}
```

- [ ] **Step 5: Render the filtered list with a filtered-empty state**

Replace the timeline body that currently starts `{data.appointments.length === 0 ? (` … through its mapping. Use `visibleAppointments` for the map and handle both empty cases:

```tsx
            {appointments.length === 0 ? (
              <p className="text-on-surface-variant">No appointments yet.</p>
            ) : visibleAppointments.length === 0 ? (
              <p className="text-on-surface-variant">
                No appointments match these filters.
              </p>
            ) : (
              <div className="space-y-4">
                {visibleAppointments.map(appt => {
```

Leave the inner card JSX unchanged. Ensure the closing brackets of the map/ternary still balance (the `})}` and `</div>` and `)}` that previously closed the `data.appointments.map` block stay as-is).

- [ ] **Step 6: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add "frontend/src/app/doctor/patients/[id]/page.tsx"
git commit -m "feat(patients): status-chip and text-search filtering on detail timeline"
```

---

## Final verification

- [ ] Backend: `cd backend && npx jest appointments.service` → all green.
- [ ] Backend typecheck: `cd backend && npx tsc --noEmit` → no new errors.
- [ ] Frontend typecheck: `cd frontend && npx tsc --noEmit` → no new errors.
- [ ] Manual smoke (optional, needs both servers): roster — type a word that appears only in a consultation note; the patient surfaces with a highlighted "Matched:" snippet. Detail — status chips filter, text box filters, both compose, count shows "showing X of Y", empty filter state appears.
