# Patient Dashboard — App Shell Redesign

**Date:** 2026-05-30  
**Status:** Approved  
**Branch:** features/improvements

---

## Problem

The patient-authenticated pages (`/`, `/appointments`, `/records`, `/notifications`, `/profile`) use `PatientShell`, which renders the public-facing marketing `Header` and `Footer`. This makes the logged-in portal feel like a public website, not a patient-owned portal. There is no persistent patient identity, no clear portal context, and the footer contains marketing links irrelevant to logged-in patients.

## Goal

Replace the marketing shell with a proper app-shell sidebar layout — matching the quality and "ownership" feel of NowServing's patient portal — where the patient's identity is always visible and the interface clearly belongs to them.

---

## Design Decisions

### Layout: Sidebar (Approach A)
Full-page sidebar layout, consistent with the existing `DashboardLayout` used by the doctor portal.

- **Desktop:** Fixed 256px left sidebar + scrollable main content area
- **Mobile:** No sidebar; bottom nav bar (5 items, same as DashboardLayout's existing pattern)
- **No marketing header or footer** on any authenticated patient page

### Implementation: Extend `DashboardLayout` (Approach A)
The `DashboardLayout` component already has a `role: 'patient' | 'doctor'` prop that was never wired up for patients. We add patient-specific nav items and a patient identity card to it. No new layout component needed.

### Patient Identity: Card at Top of Sidebar
A prominent patient identity card sits at the top of the sidebar, below the brand mark:
- Patient avatar (profile picture if available, else initial-based gradient fallback)
- Patient full name
- "Patient Portal" badge
- Profile completion progress bar: percentage of 7 key fields filled (`fullName`, `birthdate`, `contactDetails`, `profilePictureUrl`, `address`, `city`, `region`), calculated client-side from the `/patients/profile` response

---

## Sidebar Structure

```
[🌿 Ginhawa]                    ← brand
─────────────────────────────
[Avatar  Maria Santos        ]  ← patient identity card
[         Patient Portal     ]
[         Profile: 80% ████░ ]
─────────────────────────────
  ⊞  Overview                  ← /  (PatientHome)
  🔍  Find a Doctor             ← /doctors
  🤖  AI Checker                ← /recommendations
  📅  Appointments         [2] ← /appointments (badge = upcoming count)
  📄  Records                  ← /records
  🔔  Notifications        [1] ← /notifications (badge = unread count)
  👤  Profile                  ← /profile
─────────────────────────────
  →  Log out
```

Mobile bottom nav (5 fixed items): Overview (`/`), Appointments (`/appointments`), Find a Doctor (`/doctors`), Records (`/records`), Profile (`/profile`).

---

## Nav Item Badges

- **Appointments**: shows count of PENDING + CONFIRMED appointments (fetched alongside patient profile)
- **Notifications**: shows count of unread notifications (fetched alongside patient profile)
- Badge data is fetched once on mount in `DashboardLayout` when `role="patient"`. No auto-refresh — counts update when the user navigates (component remounts).

---

## Files Changed

### Modified
- `src/components/layout/dashboard-layout.tsx`
  - Add `patientNav` items array
  - Render patient identity card when `role="patient"` (above nav, below brand)
  - Fetch `/patients/profile` for avatar + full name + profile completion percentage
  - Fetch `/appointments/patient` + `/notifications` for badge counts
  - Mobile top header: link to `/` (not `/doctor/dashboard`) when patient role

### Updated (swap shell)
- `src/app/patient-home.tsx` — `PatientShell` → `DashboardLayout role="patient"`
- `src/app/appointments/page.tsx` — same swap
- `src/app/records/page.tsx` — same swap
- `src/app/notifications/page.tsx` — same swap
- `src/app/profile/page.tsx` — same swap

### Deleted
- `src/components/layout/patient-shell.tsx` — replaced by DashboardLayout
- `src/components/layout/patient-mobile-nav.tsx` — replaced by DashboardLayout's built-in mobile nav

---

## Data Fetching in Sidebar

`DashboardLayout` when `role="patient"` fetches three endpoints on mount:

| Endpoint | Used for |
|---|---|
| `GET /patients/profile` | Avatar URL, full name, profile completion % |
| `GET /appointments/patient` | Upcoming appointments badge count |
| `GET /notifications` | Unread notifications badge count |

These are fetched in parallel. Sidebar renders with skeleton/fallback while loading. All three are already called individually by the child pages — the sidebar fetch is additive and lightweight (only the counts matter, not full data).

---

## Out of Scope

- Redesigning page content (appointments list, records, profile form) — only the shell changes
- Adding new patient features
- Changing any URL routes
- `/doctors` page layout — it is public-facing and should keep the marketing header

---

## Success Criteria

1. Logged-in patient on any of the 5 portal pages sees the sidebar (desktop) or bottom nav (mobile) — never the marketing `Header` or `Footer`
2. Patient name and avatar are visible in the sidebar identity card
3. Appointment and notification badge counts are accurate
4. Doctor portal is unaffected
5. Public marketing pages (`/doctors`, `/features`, `/for-doctors`) are unaffected
6. `PatientShell` and `PatientMobileNav` are fully removed with no remaining imports
