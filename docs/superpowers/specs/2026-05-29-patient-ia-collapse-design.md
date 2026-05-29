# Patient IA Collapse + Session-Aware Header — Design

Date: 2026-05-29
Branch: frontend/onboarding-new-schema (or new branch off it)

## Problem

The app ships two parallel front doors for the same patient flows:

- Discovery twice: public `/doctors` (big `DoctorCard`, hero, filters/sort) and logged-in `/dashboard/find-doctors` (`DoctorCardCompact`, light filter panel).
- AI symptom checker twice: public `/recommendations` (3-step wizard) and logged-in `/dashboard/ai-recommendations` (wizard + history).

The marketing `Header` has **no session logic** — a logged-in patient always sees "Log in / Sign up", and clicking the logo or "Find a Doctor" drops them onto the public marketing stack (no sidebar, different card), so they feel kicked out of the app they just logged into. Result: confusion, double maintenance, guaranteed drift.

## Goal

Collapse the patient experience into a single "logged-in website" model:

- Patient browses the same consumer pages whether logged in or out; login is reflected by a session-aware header, not a separate portal shell.
- Doctor keeps the existing back-office dashboard (`DashboardLayout` sidebar) unchanged.
- Each duplicated stack collapses to one canonical surface, folding in any logged-in-only feature the public twin lacked.

**Out of scope (deferred):** the doctor's three documentation surfaces (in-call notes / finalize / notes) and the dual "Mark Complete" + "Add Notes" button.

## Decisions (locked during brainstorming)

1. Patient IA model: **B** — collapse the patient dashboard into the consumer site (no patient sidebar). Doctor dashboard stays.
2. Patient private-page navigation: **avatar dropdown** in the header (not top-nav links).
3. Post-login landing: **personalized home at `/`** (marketing landing only for logged-out visitors).
4. Scope: **patient IA + header only**. Doctor note surfaces deferred.
5. Private routes: **rename to clean top-level URLs** (`/appointments`, `/records`, `/notifications`, `/profile`), with redirects from old `/dashboard/*` paths.
6. Canonical discovery UI: **public big-card stack** (`/doctors`: hero + `DoctorFilters` + `DoctorSort` + `DoctorCard`). Delete `DoctorCardCompact` + `/dashboard/find-doctors`.

## Architecture

### Two shells, role-gated

- **Patient = consumer site:** session-aware `Header` + `Footer`, no sidebar.
- **Doctor = back-office:** `DashboardLayout` sidebar — unchanged.
- Role gate: `session.user.role` is `"PATIENT" | "DOCTOR"` (already threaded through next-auth callbacks and `types/next-auth.d.ts`).

### Route changes

Moved to top-level (folder move + redirect):

| Old | New |
|---|---|
| `/dashboard` (overview) | folded into `/` |
| `/dashboard/appointments` | `/appointments` |
| `/dashboard/records` | `/records` |
| `/dashboard/notifications` | `/notifications` |
| `/dashboard/profile` | `/profile` |

Canonical surfaces that already exist and stay:

- `/doctors`, `/doctors/[id]` — discovery + booking. (`/doctors/[id]` already uses the same `DoctorBookingPanel` + `useDoctorDetail` + `DoctorAbout` as the dashboard twin, so it is feature-complete.)
- `/recommendations` — AI symptom checker.

Deleted:

- `/dashboard/find-doctors` and `/dashboard/find-doctors/[id]`
- `/dashboard/ai-recommendations`
- `components/doctors/DoctorCardCompact.tsx`
- the `patientNav` branch in `DashboardLayout` (becomes doctor-only)

Redirects: add a `redirects()` block in `next.config` mapping each old `/dashboard/*` path to its new top-level path (and `/dashboard` → `/`). Preserves bookmarks and in-flight links.

### Session-aware Header (`components/layout/header.tsx`)

Add `useSession`. Three variants:

- **Logged-out:** nav = Features / Find a Doctor / For Doctors; right = Log in + Sign up. (current behavior)
- **Patient:** nav = Find a Doctor (`/doctors`) / AI Symptom Checker (`/recommendations`); right = notification bell with unread badge + avatar dropdown.
  - Avatar dropdown items: My Appointments (`/appointments`), Medical Records (`/records`), Profile (`/profile`), divider, Log out (`signOut({ callbackUrl: '/login' })`).
- **Doctor** (only when they hit a public page): right = "Go to Dashboard" (`/doctor/dashboard`) + avatar/Log out. No patient nav.

Use a Radix dropdown for the avatar menu to match the design system. Bell badge reuses the unread-notifications count pattern already in `DashboardClient`.

### Personalized home (`app/page.tsx`)

Convert to a server component that branches on session:

- No session → render marketing `<Home/>` (current `HeroSection`/`FeaturesSection`/… composition).
- Patient → run the onboarding guard currently in `app/dashboard/page.tsx` (fetch `/patients/profile`; on failure redirect `/onboarding/1`), else render `<PatientHome/>`.
- Doctor → `redirect('/doctor/dashboard')`.

`<PatientHome/>` is the existing `DashboardClient` content (welcome banner, upcoming/completed/unread stat cards, recent appointments, quick actions) restyled to live inside `Header` + `Footer` with no sidebar. Quick-action links point to `/doctors`, `/recommendations`, `/records`.

### AI merge

`/recommendations` stays the 3-step wizard with `Header`/`Footer`. Fold in the only logged-in-only feature from the dashboard twin: **recommendation history**. When a session exists, fetch the patient's recommendation logs (with token) and render past checks below/beside the wizard. Then delete `/dashboard/ai-recommendations`.

### Small fixes

- `app/consultation/[appointmentId]/page.tsx:62` — patient end-call redirect `/dashboard/records` → `/records`.
- `app/(auth)/login/page.tsx:43` — patient `defaultRedirect` `/dashboard` → `/` (doctor stays `/doctor/dashboard`).
- Appointments empty-state CTA → `/doctors`.

## Testing

- Header renders the correct variant for logged-out / patient / doctor (React Testing Library).
- `/` routing matrix: logged-out → marketing; patient with profile → `PatientHome`; patient without profile → redirect `/onboarding/1`; doctor → redirect `/doctor/dashboard`.
- Old `/dashboard/*` paths redirect to the new top-level paths.
- `npm run build`, `tsc`, and lint clean.

## Risks / notes

- Internal links: ~41 references to `/dashboard` exist; the folder move plus the `redirects()` safety net covers stragglers, but update obvious in-app links (quick actions, empty states, nav) directly.
- `DashboardLayout` stays for the doctor; only the patient nav array and patient call sites are removed.
- No backend changes required; discovery and recommendation history endpoints already exist.
