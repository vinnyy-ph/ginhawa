# Notification Deep-Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make notification rows navigate to their subject's list page, and make rows with no destination stop looking clickable.

**Architecture:** A pure role-aware helper maps `NotificationType` → route (or null). Both notification pages compute the route per row, navigate on click, and apply clickable styling only when a route exists. Frontend-only; no backend or schema change.

**Tech Stack:** Next.js + React + TypeScript. No frontend test runner — the helper is verified by executing the real source in Node (Node 24 type-stripping), plus `tsc`/`lint`/`build`.

> **Note for the engineer:** `frontend/AGENTS.md` warns this Next.js version has breaking changes — consult `node_modules/next/dist/docs/` before framework-level code. These tasks only add a `useRouter` import (`next/navigation`) and a pure helper, so no unfamiliar APIs are introduced.

---

## File Structure

- Create: `frontend/src/lib/notification-links.ts` — `notificationHref(type, role)` pure mapper.
- Modify: `frontend/src/app/notifications/page.tsx` — patient page (role `'patient'`).
- Modify: `frontend/src/app/doctor/notifications/page.tsx` — doctor page (role `'doctor'`).

Both pages currently contain an identical notification-row block (verified):
```tsx
<div 
  key={notif.id} 
  className={cn(
    "p-5 transition-colors cursor-pointer group flex gap-4 items-start",
    isUnread ? "bg-primary/5 hover:bg-primary/10" : "bg-surface-white hover:bg-surface"
  )}
  onClick={() => {
    if (isUnread) markAsRead(notif.id);
  }}
>
```
`isUnread` is computed earlier in the same `.map` callback as `const isUnread = !notif.readAt;`.

---

## Task 1: `notificationHref` helper

**Files:**
- Create: `frontend/src/lib/notification-links.ts`

- [ ] **Step 1: Write the helper**

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

- [ ] **Step 2: Verify the mapping by running the real source in Node**

Create `/home/vincentdev/.claude/jobs/349a3140/tmp/notif-links-test.mjs`:

```js
import { notificationHref } from '/home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/lib/notification-links.ts';

const cases = [
  ['APPOINTMENT_BOOKED', 'patient', '/appointments'],
  ['APPOINTMENT_CONFIRMED', 'patient', '/appointments'],
  ['APPOINTMENT_CANCELLED', 'doctor', '/doctor/appointments'],
  ['APPOINTMENT_COMPLETED', 'doctor', '/doctor/appointments'],
  ['APPOINTMENT_RESCHEDULED', 'patient', '/appointments'],
  ['APPOINTMENT_REMINDER', 'doctor', '/doctor/appointments'],
  ['MEDICAL_RECORD_CREATED', 'patient', '/records'],
  ['PRESCRIPTION_READY', 'patient', '/records'],
  ['MEDICAL_RECORD_CREATED', 'doctor', null],
  ['PRESCRIPTION_READY', 'doctor', null],
  ['GENERAL', 'patient', null],
  ['GENERAL', 'doctor', null],
  ['SOMETHING_UNKNOWN', 'patient', null],
];

let fail = 0;
for (const [type, role, expected] of cases) {
  const got = notificationHref(type, role);
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${type}/${role} => ${got} (expect ${expected})`);
}
console.log(fail === 0 ? 'ALL PASS' : `${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
```

Run: `node /home/vincentdev/.claude/jobs/349a3140/tmp/notif-links-test.mjs`
Expected: all `PASS`, final line `ALL PASS`, exit 0.

- [ ] **Step 3: Typecheck + lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: clean (pre-existing lint errors in `patients/` pages and `DoctorCard.tsx` are unrelated — ignore; the new file must be clean).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/notification-links.ts
git commit -m "feat(notifications): add notificationHref route mapper"
```

---

## Task 2: Wire the patient notifications page

**Files:**
- Modify: `frontend/src/app/notifications/page.tsx`

- [ ] **Step 1: Add imports**

Add after the existing `next-auth/react` import line near the top:
```ts
import { useRouter } from "next/navigation";
import { notificationHref } from "@/lib/notification-links";
```

- [ ] **Step 2: Get the router inside the component**

Just after the existing `const { data: session, status } = useSession();` (or equivalent session hook line at the top of the component), add:
```ts
const router = useRouter();
```

- [ ] **Step 3: Compute the href per row**

In the row `.map` callback, directly after the existing `const isUnread = !notif.readAt;`, add:
```ts
const href = notificationHref(notif.type, "patient");
```

- [ ] **Step 4: Update the row className + onClick**

Replace this exact block:
```tsx
                    className={cn(
                      "p-5 transition-colors cursor-pointer group flex gap-4 items-start",
                      isUnread ? "bg-primary/5 hover:bg-primary/10" : "bg-surface-white hover:bg-surface"
                    )}
                    onClick={() => {
                      if (isUnread) markAsRead(notif.id);
                    }}
```
with:
```tsx
                    className={cn(
                      "p-5 transition-colors flex gap-4 items-start",
                      href ? "cursor-pointer group" : "cursor-default",
                      isUnread ? "bg-primary/5" : "bg-surface-white",
                      href && (isUnread ? "hover:bg-primary/10" : "hover:bg-surface")
                    )}
                    onClick={() => {
                      if (isUnread) markAsRead(notif.id);
                      if (href) router.push(href);
                    }}
```

- [ ] **Step 5: Typecheck + lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: clean (ignore the pre-existing unrelated errors noted in Task 1).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/notifications/page.tsx
git commit -m "feat(notifications): deep-link patient notification rows"
```

---

## Task 3: Wire the doctor notifications page

**Files:**
- Modify: `frontend/src/app/doctor/notifications/page.tsx`

- [ ] **Step 1: Add imports**

Add after the existing `next-auth/react` import line near the top:
```ts
import { useRouter } from "next/navigation";
import { notificationHref } from "@/lib/notification-links";
```

- [ ] **Step 2: Get the router inside the component**

Just after the existing session hook line at the top of the component (`const { data: session, status } = useSession();` or equivalent), add:
```ts
const router = useRouter();
```

- [ ] **Step 3: Compute the href per row**

In the row `.map` callback, directly after the existing `const isUnread = !notif.readAt;`, add:
```ts
const href = notificationHref(notif.type, "doctor");
```

- [ ] **Step 4: Update the row className + onClick**

Replace this exact block:
```tsx
                    className={cn(
                      "p-5 transition-colors cursor-pointer group flex gap-4 items-start",
                      isUnread ? "bg-primary/5 hover:bg-primary/10" : "bg-surface-white hover:bg-surface"
                    )}
                    onClick={() => {
                      if (isUnread) markAsRead(notif.id);
                    }}
```
with:
```tsx
                    className={cn(
                      "p-5 transition-colors flex gap-4 items-start",
                      href ? "cursor-pointer group" : "cursor-default",
                      isUnread ? "bg-primary/5" : "bg-surface-white",
                      href && (isUnread ? "hover:bg-primary/10" : "hover:bg-surface")
                    )}
                    onClick={() => {
                      if (isUnread) markAsRead(notif.id);
                      if (href) router.push(href);
                    }}
```

- [ ] **Step 5: Build + lint (full verification for both pages)**

Run: `cd frontend && npx tsc --noEmit && npm run lint && npm run build`
Expected: tsc clean; no new lint errors in the two notification pages or the helper; build succeeds (33 pages).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/doctor/notifications/page.tsx
git commit -m "feat(notifications): deep-link doctor notification rows"
```

---

## Self-Review Notes

- **Spec coverage:** helper with exact mapping (Task 1) + Node verification of all enum values incl. `GENERAL→null` and record-types `doctor→null`; patient page wired with role `'patient'` (Task 2); doctor page wired with role `'doctor'` (Task 3); conditional affordance (cursor/hover only when `href`) in both. No backend change — matches spec out-of-scope.
- **Placeholder scan:** none — every step has concrete code and exact commands.
- **Type consistency:** `notificationHref(type: string, role: 'doctor' | 'patient'): string | null` defined in Task 1 is called with a string `notif.type` and a literal role in Tasks 2–3; `href` (string | null) gates both `router.push` and the className — consistent across both pages.
