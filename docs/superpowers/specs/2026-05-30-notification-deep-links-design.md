# Notification Deep-Links — Design

**Date:** 2026-05-30
**Branch:** frontend/onboarding-new-schema
**Status:** Approved, ready for implementation plan

## Problem

Both notification pages (`doctor/notifications/page.tsx`, `notifications/page.tsx`) render each row with `cursor-pointer`, hover highlight, and `group` styling — it looks clickable. But the `onClick` only marks the notification read. Clicking "Appointment confirmed" does not take the user to the appointment. The row dresses like a link and behaves like a checkbox: a dead-end click and a broken affordance.

## Goal

Make a notification row navigate to its subject, and make rows that have no destination stop looking clickable.

## Decision (from brainstorming)

Route by `NotificationType` + current role to the relevant **list page**. Pure frontend, no schema change. There are no per-appointment/per-record detail pages and no `relatedId` on `Notification`, so the list page is the deepest existing target — that is the accepted trade-off (lands on the list, not a highlighted row).

## Routes (confirmed to exist)

- Patient: `/appointments`, `/records`, `/notifications`
- Doctor: `/doctor/appointments`, `/doctor/notifications`

Each notifications page is role-fixed, so role is a literal per page (`'patient'` for `notifications/page.tsx`, `'doctor'` for `doctor/notifications/page.tsx`).

## Component 1 — mapping helper

New file `frontend/src/lib/notification-links.ts`:

```ts
const APPOINTMENT_TYPES = new Set([
  'APPOINTMENT_BOOKED',
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_COMPLETED',
  'APPOINTMENT_RESCHEDULED',
  'APPOINTMENT_REMINDER',
]);

const RECORD_TYPES = new Set(['MEDICAL_RECORD_CREATED', 'PRESCRIPTION_READY']);

/**
 * Map a notification type + the viewing role to the route its subject lives on.
 * Returns null when there is no meaningful destination (e.g. GENERAL).
 */
export function notificationHref(
  type: string,
  role: 'doctor' | 'patient',
): string | null {
  if (APPOINTMENT_TYPES.has(type)) {
    return role === 'doctor' ? '/doctor/appointments' : '/appointments';
  }
  if (RECORD_TYPES.has(type)) {
    // Record/prescription notifications are only delivered to patients.
    return role === 'patient' ? '/records' : null;
  }
  return null;
}
```

One responsibility: `(type, role) → route | null`. Pure, no React, independently testable.

## Component 2 — wire the two notification pages

For each of `doctor/notifications/page.tsx` (role `'doctor'`) and `notifications/page.tsx` (role `'patient'`):

1. Add imports: `useRouter` from `next/navigation`, `notificationHref` from `@/lib/notification-links`.
2. Inside the component: `const router = useRouter();`
3. Inside the row `.map`, compute `const href = notificationHref(notif.type, '<role>');`
4. Replace the row click handler:
   ```ts
   onClick={() => {
     if (isUnread) markAsRead(notif.id);
     if (href) router.push(href);
   }}
   ```
5. Make the affordance conditional. The current row `className` hardcodes `cursor-pointer ... group`. Change so the pointer/hover/group classes apply only when `href` is truthy; when `href` is null use `cursor-default` and drop the hover background change. The unread/read background tint stays as-is.

No other behavior changes (mark-all-read, unread badge, time formatting, empty state all untouched).

## Data flow

`notif.type` (already on the `Notification` object from `GET /notifications`) + page role literal → `notificationHref` → either `router.push(route)` on click or a non-interactive row.

## Out of scope

- `Notification.relatedId` / schema migration.
- Row highlighting on the destination list.
- New detail pages (`/appointments/[id]`, `/records/[id]`).
- Any backend change.

## Testing

- Frontend has no test runner. Verify `notificationHref` by executing the real source in Node: assert every `NotificationType` enum value maps correctly for both roles, including `GENERAL → null` and record-types for `doctor → null`.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` clean.
- Manual affordance check is desirable but the environment has no browser (no Chrome binary); rely on build + helper verification.
