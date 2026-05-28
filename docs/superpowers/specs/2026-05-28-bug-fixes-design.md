# Bug Fixes Design — Smoke Test Findings
**Date:** 2026-05-28
**Source:** `docs/audits/smoke_test_2026-05-28_123750.md`
**Scope:** 12 bugs — 7 backend, 5 frontend. Fixed in priority order.

---

## BUG-01 — passwordHash exposed in appointment API responses
**Severity:** Critical (security)
**Files:** `backend/src/appointments/appointments.service.ts`

Every `include: { user: true }` that joins the `User` model must be replaced with an explicit `select` that omits `passwordHash`.

Affected methods — only `create()` and `updateStatus()` join `user`:
- `create()` — `include: { doctor: { include: { user: true } } }`
- `updateStatus()` — `include: { patient: { include: { user: true } }, doctor: { include: { user: true } } }`

`findAllForPatient()` and `findAllForDoctor()` use `doctor: true` / `patient: true` which only joins the profile, not the User — safe, no change needed.

Replace every `user: true` with:
```typescript
user: { select: { id: true, email: true, role: true } }
```

No schema or DTO changes needed.

---

## BUG-02 — Duplicate email signup returns 500
**Severity:** High (runtime crash + broken frontend error message)
**Files:** `backend/src/users/users.service.ts`

Prisma throws `PrismaClientKnownRequestError` with code `P2002` on unique constraint violation. Wrap `prisma.user.create()` in try/catch:

```typescript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// in create():
try {
  return await this.prisma.user.create({ ... });
} catch (e) {
  if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
    throw new ConflictException('Email already in use');
  }
  throw e;
}
```

This makes the frontend's existing `err.status === 409` check work correctly and show "An account with this email already exists."

---

## BUG-03 — Delete booked slot returns 500
**Severity:** High (runtime crash)
**Files:** `backend/src/slots/slots.service.ts`

In `remove()`, add a status check before calling `prisma.availabilitySlot.delete()`:

```typescript
if (slot.status === SlotStatus.BOOKED) {
  throw new BadRequestException('Cannot delete a booked slot. Cancel the appointment first.');
}
```

Add this after the ownership check (`slot.doctorId !== doctor.id`). Import `SlotStatus` from `@prisma/client`.

---

## BUG-04 — Upload with no file returns 500
**Severity:** High (runtime crash)
**Files:** `backend/src/uploads/uploads.controller.ts`

Add a null guard as the first line of the upload handler:

```typescript
if (!file) {
  throw new BadRequestException('No file uploaded');
}
```

Import `BadRequestException` from `@nestjs/common`.

---

## BUG-05 — Past slot booking allowed at API level
**Severity:** High (data integrity)
**Files:** `backend/src/appointments/appointments.service.ts`

In `create()`, inside the Prisma transaction, after fetching the slot and checking `slot.status !== AVAILABLE`, add:

```typescript
if (new Date(slot.startTime) < new Date()) {
  throw new BadRequestException('Cannot book a slot in the past');
}
```

---

## BUG-06 — No appointment status transition guard
**Severity:** High (business logic)
**Files:** `backend/src/appointments/appointments.service.ts`

In `updateStatus()`, after the authorization checks and before the slot-freeing logic, add a transition allowlist using a flat map:

```typescript
type TransitionKey = `${string}:${string}:${string}`;
const allowed = new Set<TransitionKey>([
  'DOCTOR:PENDING:CONFIRMED',
  'DOCTOR:PENDING:CANCELLED',
  'DOCTOR:CONFIRMED:CANCELLED',
  'DOCTOR:CONFIRMED:COMPLETED',
  'PATIENT:PENDING:CANCELLED',
  'PATIENT:CONFIRMED:CANCELLED',
]);

const key: TransitionKey = `${role}:${appointment.status}:${status}`;
if (!allowed.has(key)) {
  throw new BadRequestException(
    `Invalid status transition: ${appointment.status} → ${status}`,
  );
}
```

Place this block immediately after the role authorization checks (after the `else { throw new ForbiddenException('Unauthorized role') }` block), before the slot-freeing logic.

Allowed transitions summary:
| Role | From | To |
|------|------|----|
| DOCTOR | PENDING | CONFIRMED |
| DOCTOR | PENDING or CONFIRMED | CANCELLED |
| DOCTOR | CONFIRMED | COMPLETED |
| PATIENT | PENDING or CONFIRMED | CANCELLED |

---

## BUG-07 — Recommendations patientId always null
**Severity:** High (feature broken)
**Files:** `backend/src/recommendations/recommendations.controller.ts`

The `create` handler has both `@Public()` and `@UseGuards(JwtAuthGuard)`. `@Public()` causes the global guard to skip JWT entirely, so `req.user` is always `undefined`.

**Fix:** Remove `@Public()` from the `create` handler. Create an `@OptionalJwt()` decorator that runs `JwtAuthGuard` but does not reject unauthenticated requests:

**New file:** `backend/src/auth/decorators/optional-jwt.decorator.ts`
```typescript
import { SetMetadata } from '@nestjs/common';
export const OPTIONAL_JWT_KEY = 'optional_jwt';
export const OptionalJwt = () => SetMetadata(OPTIONAL_JWT_KEY, true);
```

**Modify** `backend/src/auth/guards/jwt-auth.guard.ts` to check for `optional_jwt` metadata and return `true` (allow) instead of throwing when no token/invalid token is present:

```typescript
import { OPTIONAL_JWT_KEY } from '../decorators/optional-jwt.decorator';

canActivate(context: ExecutionContext) {
  const isOptional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_JWT_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
  
  if (isOptional) {
    // Try to authenticate but don't throw if it fails
    return super.canActivate(context).then?.(() => true).catch?.(() => true) ?? true;
  }
  return super.canActivate(context);
}
```

**Modify** `recommendations.controller.ts:create()`:
- Remove `@Public()`
- Add `@OptionalJwt()`
- Keep `@UseGuards(JwtAuthGuard)`

With this change, authenticated users have `req.user` populated; unauthenticated callers have `req.user = undefined`. The `userId = req.user?.id ?? null` logic works correctly for both.

---

## BUG-08 — Login ignores callbackUrl
**Severity:** Medium (UX)
**Files:** `frontend/src/app/(auth)/login/page.tsx`

Add `useSearchParams()` and read `callbackUrl`. After successful login, redirect to it:

```typescript
'use client';
import { useSearchParams } from 'next/navigation';

// inside component:
const searchParams = useSearchParams();
const callbackUrl = searchParams.get('callbackUrl');

// in onSubmit after result?.ok:
const redirectTo = callbackUrl
  ? decodeURIComponent(callbackUrl)
  : role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard';
router.push(redirectTo);
```

Wrap the component in a `<Suspense>` boundary since `useSearchParams()` requires it in Next.js App Router.

---

## BUG-09 — No patient profile edit page
**Severity:** Medium (missing feature)
**Files to create:** `frontend/src/app/dashboard/profile/page.tsx`
**Files to modify:** `frontend/src/components/layout/dashboard-layout.tsx`

New page pre-fills from `GET /patients/profile` and submits changes via `PATCH /patients/profile`. Fields: fullName, birthdate, contactDetails, weight, height, medicalHistory, profilePictureUrl.

Add to `patientNav` in `dashboard-layout.tsx`:
```typescript
{ href: '/dashboard/profile', label: 'My Profile', icon: <PersonIcon className="w-4 h-4" /> }
```
Insert after "Overview" (index 1).

---

## BUG-10 — No doctor profile edit page
**Severity:** Medium (missing feature)
**Files to create:** `frontend/src/app/doctor/profile/page.tsx`
**Files to modify:** `frontend/src/components/layout/dashboard-layout.tsx`

New page pre-fills from `GET /doctors/profile` and submits via `PATCH /doctors/profile`. Fields: fullName, professionalTitle, specialization, bio, yearsOfExperience, consultationFee, languagesSpoken, consultationFocusAreas, availabilitySummary, profilePictureUrl.

Add to `doctorNav` in `dashboard-layout.tsx`:
```typescript
{ href: '/doctor/profile', label: 'My Profile', icon: <PersonIcon className="w-4 h-4" /> }
```
Insert after "Overview" (index 1).

---

## BUG-11 — Cancel appointment has no confirmation dialog
**Severity:** Medium (UX / healthcare trust)
**Files:** `frontend/src/components/appointment-card.tsx`

Add `confirmingCancelId` state at the page level (passed as prop) OR inline at card level. Inline approach (simpler — no prop drilling):

Add local state `const [confirmCancel, setConfirmCancel] = useState(false)` inside `AppointmentCard`.

Replace the Cancel button with:
```tsx
{!confirmCancel ? (
  <Button variant="destructive" size="sm" onClick={() => setConfirmCancel(true)} ...>
    Cancel
  </Button>
) : (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-error font-semibold">Cancel appointment?</span>
    <button onClick={() => { onUpdateStatus?.(appt.id, 'CANCELLED'); setConfirmCancel(false); }} className="px-2 py-1 bg-error text-white rounded text-xs">Yes</button>
    <button onClick={() => setConfirmCancel(false)} className="px-2 py-1 bg-surface-container rounded text-xs">No</button>
  </div>
)}
```

Pattern matches the existing slot deletion confirm in `doctor/schedule/page.tsx`.

---

## BUG-12 — Stale test mocks in doctor specs
**Severity:** Low (test coverage gap)
**Files:**
- `backend/src/doctors/doctors.controller.spec.ts`
- `backend/src/doctors/doctors.service.spec.ts`

**`doctors.controller.spec.ts`:** Add `upsertProfile: jest.fn()` to the `DoctorsService` mock object. Update test cases that call `create` to call `upsertProfile` instead.

**`doctors.service.spec.ts`:** Add `upsert: jest.fn()` to the Prisma `doctorProfile` mock. Update affected test cases to match the `upsertProfile` implementation (upsert instead of findUnique + create).

---

## Implementation Order

1. BUG-01 (security — passwordHash)
2. BUG-07 (feature broken — recommendations)
3. BUG-02 (500 — duplicate email)
4. BUG-03 (500 — delete booked slot)
5. BUG-04 (500 — upload no file)
6. BUG-05 (past slot booking)
7. BUG-06 (status transition guard)
8. BUG-12 (test mocks)
9. BUG-08 (login callbackUrl)
10. BUG-11 (cancel confirm dialog)
11. BUG-09 (patient profile edit page)
12. BUG-10 (doctor profile edit page)

All backend fixes first, then frontend. Each fix is independent — no fix depends on another.
