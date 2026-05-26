# Doctors Discovery & Profile Redesign

**Date:** 2026-05-27  
**Branch:** frontend/discovery-booking  
**Scope:** Full visual redesign of `/doctors` (listing) and `/doctors/[id]` (profile + booking). All backend wiring preserved.

---

## Goals

- Replace the existing `/doctors` and `/doctors/[id]` pages with a polished redesign using the Ginhawa design system
- Add a shared navigation shell (`layout.tsx`) so both pages get `<Header>` and `<Footer>`
- Add a "Find a Doctor" link to the main site header
- Page is publicly accessible without authentication (existing middleware config already excludes `/doctors`)
- All backend connections, data types, and booking logic are preserved unchanged

---

## Architecture

### Files Changed

| File | Change |
|---|---|
| `frontend/src/app/doctors/layout.tsx` | **New** — shared shell rendering `<Header>` + `{children}` + `<Footer>` |
| `frontend/src/app/doctors/page.tsx` | **Full redesign** — listing page, keep all fetch/filter logic |
| `frontend/src/app/doctors/[id]/page.tsx` | **Full redesign** — profile + booking, keep all fetch/booking logic |
| `frontend/src/components/layout/header.tsx` | **Minor** — add "Find a Doctor" nav link pointing to `/doctors` |

### No changes to
- `frontend/src/lib/api-client.ts`
- `frontend/src/types/api.ts` (`DoctorProfile`, `AvailabilitySlot`)
- `frontend/src/components/booking/slot-picker.tsx`
- `frontend/src/middleware.ts`
- All backend files

---

## Design System Reference

From `docs/DESIGN.md` (Ginhawa):

- **Primary gradient:** `#48cab6` → `#31a795`
- **Deep teal:** `#006b5e`
- **Surface:** `#f7faf9`
- **Surface white:** `#ffffff`
- **Text primary:** `#1a3a35`
- **On-surface-variant:** `#3d4946`
- **Outline-variant:** `#bcc9c5`
- **Fonts:** Plus Jakarta Sans (headings), Manrope (body)
- **Shadows:** Soft tinted shadow (`rgba(49,167,149,0.10)`)
- **Border radius:** Cards `1rem`, buttons `0.5rem`, pills `9999px`

---

## Listing Page — `/doctors`

### Hero Section
- Full-bleed teal gradient background (`#006b5e` → `#31a795` → `#48cab6`), full viewport width
- Inner container max-width `1200px`, horizontally centered, `px-4 sm:px-6 lg:px-8`
- Content:
  - Small caps label: "Ginhawa Telehealth" (white, `tracking-widest`, `text-xs`)
  - Headline: "Find a Doctor" (Plus Jakarta Sans, `font-bold`, white, `text-4xl md:text-5xl`)
  - Tagline: "Search and book consultations with top medical professionals — from the comfort of your home." (white/80% opacity, Manrope)
  - Search bar: white background, `rounded-lg`, teal focus ring, magnifying glass icon left, `placeholder` text "Search by name, specialization, or keyword…"
  - Doctor count badge at right end on desktop (`text-2xl font-bold` count, small label): only shown when data is loaded and non-empty

### Filter Bar
- Rendered below the hero, inside a `bg-surface-white rounded-lg shadow-soft p-5` container
- Specialization pills derived client-side from fetched doctors (`useMemo`, existing logic)
- "All" pill: filled primary when selected, outline otherwise
- Each specialty pill: toggles `selectedSpecialization` state; de-selects if clicked when already active
- Pills use `aria-pressed` for accessibility

### Doctor Card Grid
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`
- **Card anatomy:**
  1. **Accent bar:** `h-1.5` gradient top strip (`#48cab6` → `#31a795`)
  2. **Avatar:** 56×56 circular photo (if `profilePictureUrl`) or gradient initials fallback (2-letter, `font-bold text-lg text-white`), `ring-2 ring-primary/20`
  3. **Name:** `font-bold text-base text-text-primary`, truncated; prefixed with `professionalTitle` if present
  4. **Professional title** (secondary line, `text-sm text-on-surface-variant`)
  5. **Specialization badge:** outline pill, `border-primary/40 text-primary`
  6. **Stats row:** years experience (left) + consultation fee in ₱ (right), `text-xs`; only rendered if either field is present
  7. **Bio:** `line-clamp-2 text-sm text-on-surface-variant`; fallback "No biography available."
  8. **CTA button:** full-width; `variant="default"` gradient for patients, `variant="outline"` for guests/doctors
- Card hover: `hover:-translate-y-0.5 hover:shadow-lifted transition-all duration-200 border border-transparent hover:border-primary/10`

### States
- **Loading:** 6 skeleton cards with pulse animation, matching card structure
- **Empty:** Centered icon + "No doctors found" heading + "Clear Filters" outline button
- **Error:** Centered error icon + message + "Try Again" button → calls `fetchDoctors()`

### Data & Logic (preserved)
- `fetchDoctors()` — `GET /doctors` via `apiRequest<DoctorProfile[]>`; no auth token needed
- `searchTerm` filters by `fullName`, `specialization`, `bio` (client-side, case-insensitive)
- `selectedSpecialization` — exact match filter, client-side
- `useSearchParams()` reads `?specialization=` on mount to pre-set filter (existing)
- `isPatient` derived from `session?.user?.role === 'PATIENT'`

---

## Profile Page — `/doctors/[id]`

### Hero Section
- Full-bleed gradient header (`#006b5e` → `#31a795` → `#48cab6`)
- Inner container max-width `1200px`
- "← Back to Doctors" link at top (white, semi-transparent, `ArrowLeftIcon`)
- Doctor identity row:
  - Avatar: `w-24 h-24 sm:w-28 sm:h-28` circular photo or gradient initials (`text-3xl font-bold`), `ring-4 ring-white/30`
  - Name: Plus Jakarta Sans, `text-3xl sm:text-4xl font-bold text-white`; prefixed with `professionalTitle`
  - Inline pill badges (glass style, `bg-white/20 text-white rounded-full`): specialization, years experience (if set), consultation fee in ₱ (if set)

### Body Layout
- `grid-cols-1 lg:grid-cols-3 gap-8` below the hero
- **Left column (lg:col-span-2):**
  - "About" section: bio paragraphs split on `\n`; italic placeholder if no bio
  - "Focus Areas" section (if `consultationFocusAreas`): comma-split chips in `bg-surface-container rounded-md`
  - "Languages" row (if `languagesSpoken`): label + value
- **Right column (lg:col-span-1):**
  - Sticky panel (`sticky top-24`)
  - White card, `rounded-xl shadow-soft border border-outline-variant/30`
  - Teal-tinted card header: "Book Appointment" with `CalendarIcon`
  - **Auth states (all existing logic):**
    - Guest: info text + "Sign In to Book" full-width button → `/login`
    - Doctor role: informational message, no booking action
    - Patient: `<SlotPicker>` + reason textarea + "Confirm Booking" submit button
  - Inline booking error (`text-error text-xs`)
  - Success toast: fixed top-center, slide-in animation, green background + checkmark

### Booking Flow (preserved)
- `POST /appointments` with `{ slotId, reasonForVisit }` and JWT bearer token
- On success: `setBookingSuccess(true)` → redirect to `/dashboard/appointments` after 1.5s
- Slots fetched in parallel with doctor: `GET /doctors/:id/slots`, filtered to `AVAILABLE` + future, sorted chronologically

### Loading / Error States
- `PageSkeleton`: pulse animation matching the hero + body structure
- 404/error: gradient hero shell (same as normal) + centered error card with "Return to Directory" button

---

## Header Update

Add a "Find a Doctor" nav link to `frontend/src/components/layout/header.tsx` in the `<nav>` alongside the existing links:

```
href="/doctors"
text="Find a Doctor"
className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
```

---

## Shared Layout

`frontend/src/app/doctors/layout.tsx`:

```tsx
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function DoctorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

Both `/doctors` and `/doctors/[id]` inherit this automatically.

---

## Success Criteria

- [ ] `/doctors` loads and displays real doctor data without authentication
- [ ] Search and specialization filter work client-side
- [ ] "Book Now" shown for authenticated patients; "View Profile" for guests/doctors
- [ ] `/doctors/[id]` displays doctor profile and available slots
- [ ] Booking flow completes and redirects to dashboard (authenticated patients only)
- [ ] Both pages show `<Header>` and `<Footer>` navigation
- [ ] "Find a Doctor" link appears in the main site header
- [ ] Skeleton, empty, and error states render correctly
- [ ] No TypeScript errors
