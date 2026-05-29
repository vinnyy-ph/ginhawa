# My Doctors Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "My Doctors" page to the patient portal listing every doctor the patient has had an appointment with, with visit stats and quick actions to view their profile or book again.

**Architecture:** New `GET /appointments/patient/doctors` backend endpoint aggregates distinct doctors from the patient's appointments. New frontend page at `/my-doctors` calls this endpoint and renders a horizontal list layout. Patient sidebar nav gains a "My Doctors" entry after "Find a Doctor".

**Tech Stack:** NestJS (backend), Next.js 14 App Router + `"use client"` (frontend), Prisma ORM, NextAuth session, Radix UI icons, Tailwind CSS (Ginhawa design tokens)

---

## Files

| Action | Path |
|--------|------|
| Modify | `backend/src/appointments/appointments.service.ts` |
| Modify | `backend/src/appointments/appointments.service.spec.ts` |
| Modify | `backend/src/appointments/appointments.controller.ts` |
| Modify | `frontend/src/types/api.ts` |
| Create | `frontend/src/app/my-doctors/page.tsx` |
| Modify | `frontend/src/components/layout/dashboard-layout.tsx` |

---

### Task 1: Backend service method + tests

**Files:**
- Modify: `backend/src/appointments/appointments.service.ts`
- Modify: `backend/src/appointments/appointments.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Open `backend/src/appointments/appointments.service.spec.ts`. Add the following `describe` block after the existing `findPatientsForDoctor` describe block (before the final closing `}`):

```typescript
describe('findDoctorsForPatient', () => {
  const pastTime1 = new Date(Date.now() - 86400000);   // yesterday
  const pastTime2 = new Date(Date.now() - 172800000);  // 2 days ago
  const futureTime = new Date(Date.now() + 86400000);  // tomorrow

  function makeAppt(
    doctorId: string,
    slotTime: Date,
    status: AppointmentStatus,
    doctorName: string,
  ) {
    return {
      id: `appt-${doctorId}-${slotTime.getTime()}`,
      patientId: 'patient-1',
      doctorId,
      status,
      doctor: {
        id: doctorId,
        fullName: doctorName,
        professionalTitle: 'MD',
        specialization: 'General Practice',
        profilePictureUrl: null,
      },
      slot: { startTime: slotTime },
    };
  }

  it('aggregates totalVisits per doctor', async () => {
    mockPrismaService.appointment.findMany.mockResolvedValue([
      makeAppt('doc-1', pastTime1, AppointmentStatus.COMPLETED, 'Dr. A'),
      makeAppt('doc-1', pastTime2, AppointmentStatus.COMPLETED, 'Dr. A'),
      makeAppt('doc-2', pastTime1, AppointmentStatus.COMPLETED, 'Dr. B'),
    ]);

    const result = await service.findDoctorsForPatient('user-1');

    expect(result).toHaveLength(2);
    const docA = result.find((r) => r.doctor.id === 'doc-1')!;
    expect(docA.totalVisits).toBe(2);
    expect(docA.upcomingCount).toBe(0);
  });

  it('counts upcoming (PENDING or CONFIRMED future) appointments', async () => {
    mockPrismaService.appointment.findMany.mockResolvedValue([
      makeAppt('doc-1', futureTime, AppointmentStatus.CONFIRMED, 'Dr. A'),
      makeAppt('doc-1', pastTime1, AppointmentStatus.COMPLETED, 'Dr. A'),
    ]);

    const result = await service.findDoctorsForPatient('user-1');

    expect(result[0].upcomingCount).toBe(1);
    expect(result[0].totalVisits).toBe(2);
  });

  it('sets lastVisit to most recent past slot', async () => {
    mockPrismaService.appointment.findMany.mockResolvedValue([
      makeAppt('doc-1', pastTime2, AppointmentStatus.COMPLETED, 'Dr. A'),
      makeAppt('doc-1', pastTime1, AppointmentStatus.COMPLETED, 'Dr. A'),
    ]);

    const result = await service.findDoctorsForPatient('user-1');

    expect(result[0].lastVisit).toBe(pastTime1.toISOString());
  });

  it('sorts results by lastVisit descending', async () => {
    mockPrismaService.appointment.findMany.mockResolvedValue([
      makeAppt('doc-2', pastTime2, AppointmentStatus.COMPLETED, 'Dr. B'),
      makeAppt('doc-1', pastTime1, AppointmentStatus.COMPLETED, 'Dr. A'),
    ]);

    const result = await service.findDoctorsForPatient('user-1');

    expect(result[0].doctor.id).toBe('doc-1');
    expect(result[1].doctor.id).toBe('doc-2');
  });

  it('throws NotFoundException when patient profile not found', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValueOnce(null);

    await expect(service.findDoctorsForPatient('no-such-user')).rejects.toThrow(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npx jest appointments.service.spec.ts
```

Expected: 5 new failures with `TypeError: service.findDoctorsForPatient is not a function`

- [ ] **Step 3: Implement the service method**

In `backend/src/appointments/appointments.service.ts`, add the following method after `findAllForPatient` (currently ends around line 123):

```typescript
async findDoctorsForPatient(userId: string) {
  const patientProfile = await this.prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (!patientProfile) {
    throw new NotFoundException('Patient profile not found');
  }

  const appointments = await this.prisma.appointment.findMany({
    where: { patientId: patientProfile.id },
    include: {
      doctor: {
        select: {
          id: true,
          fullName: true,
          professionalTitle: true,
          specialization: true,
          profilePictureUrl: true,
        },
      },
      slot: { select: { startTime: true } },
    },
  });

  const now = Date.now();
  const map = new Map<
    string,
    {
      doctor: (typeof appointments)[number]['doctor'];
      totalVisits: number;
      upcomingCount: number;
      lastVisit: string | null;
    }
  >();

  for (const appt of appointments) {
    const start = appt.slot ? appt.slot.startTime.getTime() : 0;
    const isUpcoming =
      (appt.status === AppointmentStatus.PENDING ||
        appt.status === AppointmentStatus.CONFIRMED) &&
      start >= now;

    let row = map.get(appt.doctorId);
    if (!row) {
      row = {
        doctor: appt.doctor,
        totalVisits: 0,
        upcomingCount: 0,
        lastVisit: null,
      };
      map.set(appt.doctorId, row);
    }

    row.totalVisits += 1;
    if (isUpcoming) row.upcomingCount += 1;
    if (start && start <= now) {
      const startIso = appt.slot.startTime.toISOString();
      if (!row.lastVisit || start > new Date(row.lastVisit).getTime()) {
        row.lastVisit = startIso;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (!a.lastVisit && !b.lastVisit) return 0;
    if (!a.lastVisit) return 1;
    if (!b.lastVisit) return -1;
    return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
  });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && npx jest appointments.service.spec.ts
```

Expected: All 14 tests pass (9 existing + 5 new)

- [ ] **Step 5: Commit**

```bash
git add backend/src/appointments/appointments.service.ts backend/src/appointments/appointments.service.spec.ts
git commit -m "feat: add findDoctorsForPatient service method"
```

---

### Task 2: Backend controller route

**Files:**
- Modify: `backend/src/appointments/appointments.controller.ts`

- [ ] **Step 1: Add the route**

In `backend/src/appointments/appointments.controller.ts`, insert the new route **before** the `@Get(':id')` route (currently at line 64). The complete addition:

```typescript
@Get('patient/doctors')
@Roles('PATIENT')
findDoctorsForPatient(@Request() req: { user: { id: string } }) {
  return this.appointmentsService.findDoctorsForPatient(req.user.id);
}
```

The file around the insertion point should look like this after the edit:

```typescript
  @Get('patient/doctors')
  @Roles('PATIENT')
  findDoctorsForPatient(@Request() req: { user: { id: string } }) {
    return this.appointmentsService.findDoctorsForPatient(req.user.id);
  }

  @Get(':id')
  @Roles('DOCTOR')
  findOne(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.appointmentsService.findOne(req.user.id, id);
  }
```

- [ ] **Step 2: Verify backend compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/appointments/appointments.controller.ts
git commit -m "feat: expose GET /appointments/patient/doctors endpoint"
```

---

### Task 3: Frontend type

**Files:**
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Add PatientDoctorSummary interface**

In `frontend/src/types/api.ts`, append the following after the `DoctorPatientHistory` block (after line ~115, before the `Medical Record` section comment):

```typescript
// ─── Patient's doctors (GET /appointments/patient/doctors) ──────────────────

export interface PatientDoctorSummary {
  doctor: {
    id: string; // DoctorProfile.id — use for /doctors/[id] links
    fullName: string;
    professionalTitle: string;
    specialization: string;
    profilePictureUrl?: string | null;
  };
  totalVisits: number;
  upcomingCount: number;
  lastVisit: string | null; // ISO datetime of latest past visit
}
```

- [ ] **Step 2: Verify frontend types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat: add PatientDoctorSummary type"
```

---

### Task 4: Frontend page

**Files:**
- Create: `frontend/src/app/my-doctors/page.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/app/my-doctors/page.tsx` with the following content:

```tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { formatPHDate } from "@/lib/datetime";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { MagnifyingGlassIcon, PersonIcon } from "@radix-ui/react-icons";
import type { PatientDoctorSummary } from "@/types/api";

export default function MyDoctorsPage() {
  const { data: session, status } = useSession();
  const token = session?.user?.accessToken;

  const [doctors, setDoctors] = useState<PatientDoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status]);

  async function fetchDoctors() {
    if (!token) return;
    try {
      setLoading(true);
      const data = await apiRequest<PatientDoctorSummary[]>(
        "/appointments/patient/doctors",
        { token },
      );
      setDoctors(data);
    } catch {
      setError("Failed to load your doctors.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.doctor.fullName.toLowerCase().includes(q) ||
        d.doctor.specialization.toLowerCase().includes(q),
    );
  }, [doctors, query]);

  return (
    <DashboardLayout role="patient">
      <div className="mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold text-text-primary">My Doctors</h1>
          <p className="text-on-surface-variant mt-1">
            Everyone you&apos;ve had an appointment with.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or specialty…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline/40 bg-surface-white text-text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : error ? (
          <div className="bg-surface-white p-8 rounded-xl shadow-soft text-center text-on-surface-variant">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface-white p-10 rounded-xl shadow-soft text-center">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3">
              <PersonIcon className="w-6 h-6 text-on-surface-variant" />
            </div>
            <h3 className="font-semibold text-text-primary mb-1">
              {query ? "No doctors match your search" : "No doctors yet"}
            </h3>
            <p className="text-sm text-on-surface-variant mb-4">
              {query
                ? "Try a different name or specialty."
                : "Doctors appear here once you've had an appointment."}
            </p>
            {!query && (
              <Link
                href="/doctors"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Find a Doctor
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(({ doctor, totalVisits, upcomingCount, lastVisit }) => (
              <div
                key={doctor.id}
                className="bg-surface-white rounded-xl shadow-soft flex items-center gap-4 p-4"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                  {doctor.profilePictureUrl ? (
                    <img
                      src={doctor.profilePictureUrl}
                      alt={doctor.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    doctor.fullName.charAt(0)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-text-primary truncate">{doctor.fullName}</h4>
                  <p className="text-xs text-on-surface-variant">{doctor.professionalTitle}</p>
                  <p className="text-xs text-primary font-semibold">{doctor.specialization}</p>
                </div>

                {/* Stats — hidden on mobile */}
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm text-on-surface-variant">
                    {totalVisits} {totalVisits === 1 ? "visit" : "visits"}
                    {lastVisit && (
                      <>
                        {" · Last: "}
                        <span className="text-text-primary font-medium">
                          {formatPHDate(lastVisit, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </span>
                  {upcomingCount > 0 && (
                    <Badge variant="default">{upcomingCount} upcoming</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/doctors/${doctor.id}`}
                    className="px-3 py-1.5 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    View Profile
                  </Link>
                  <Link
                    href={`/doctors/${doctor.id}`}
                    className="px-3 py-1.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Book Again
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Verify frontend types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/my-doctors/page.tsx
git commit -m "feat: add My Doctors page for patient portal"
```

---

### Task 5: Nav update

**Files:**
- Modify: `frontend/src/components/layout/dashboard-layout.tsx`

- [ ] **Step 1: Add AvatarIcon to imports**

In `frontend/src/components/layout/dashboard-layout.tsx`, find the `@radix-ui/react-icons` import block:

```typescript
import {
  HomeIcon,
  CalendarIcon,
  BellIcon,
  PersonIcon,
  ExitIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChatBubbleIcon,
  FileTextIcon,
} from '@radix-ui/react-icons';
```

Replace with:

```typescript
import {
  HomeIcon,
  CalendarIcon,
  BellIcon,
  PersonIcon,
  ExitIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChatBubbleIcon,
  FileTextIcon,
  AvatarIcon,
} from '@radix-ui/react-icons';
```

- [ ] **Step 2: Add nav item**

Find the `patientNav` array:

```typescript
const patientNav: NavItem[] = [
  { href: '/', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/doctors', label: 'Find a Doctor', icon: <MagnifyingGlassIcon className="w-4 h-4" /> },
  { href: '/recommendations', label: 'AI Checker', icon: <ChatBubbleIcon className="w-4 h-4" /> },
```

Insert after the "Find a Doctor" entry:

```typescript
const patientNav: NavItem[] = [
  { href: '/', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/doctors', label: 'Find a Doctor', icon: <MagnifyingGlassIcon className="w-4 h-4" /> },
  { href: '/my-doctors', label: 'My Doctors', icon: <AvatarIcon className="w-4 h-4" /> },
  { href: '/recommendations', label: 'AI Checker', icon: <ChatBubbleIcon className="w-4 h-4" /> },
```

- [ ] **Step 3: Verify frontend types compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/dashboard-layout.tsx
git commit -m "feat: add My Doctors nav item to patient sidebar"
```

---

### Task 6: Verify end-to-end

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && npx jest
```

Expected: all tests pass

- [ ] **Step 2: Run frontend type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run frontend build**

```bash
cd frontend && npm run build
```

Expected: build completes with no errors

- [ ] **Step 4: Delete spec and plan files**

```bash
rm docs/superpowers/specs/2026-05-30-my-doctors-page-design.md
rm docs/superpowers/plans/2026-05-30-my-doctors-page.md
git add docs/superpowers/specs/2026-05-30-my-doctors-page-design.md docs/superpowers/plans/2026-05-30-my-doctors-page.md
git commit -m "chore: delete My Doctors spec and plan (implementation complete)"
```
