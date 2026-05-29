# Design: Doctors UI Improvements
Date: 2026-05-30

## Scope

Two surfaces: `/doctors` listing cards and `/doctors/[id]` individual profile page.

---

## 1. Doctor Card (`DoctorCard.tsx`)

### 1a. Verified Badge

When `doctor.isVerified === true`, show trust signal at two levels:

- **Avatar corner:** 26×26px teal circle (`bg-primary`) with white checkmark SVG, positioned `absolute bottom-0 right-0` on the avatar wrapper, bordered `ring-2 ring-white`.
- **Name inline:** Small chip `"Verified"` with checkmark icon, styled `bg-primary/10 text-primary border border-primary/20 rounded-full text-[11px] font-bold px-2 py-0.5`, placed immediately after the name in the same flex row.

When `isVerified` is falsy, render neither element.

### 1b. Earliest Availability (replace "Available Soon")

Current logic buckets into `"Available Today"` / `"Available Soon"` / `"Fully Booked"`. Replace "Available Soon" with a computed earliest date label.

**Logic:**
1. Filter `availabilitySlots` where `status === "AVAILABLE"` and `startTime > now`.
2. Sort ascending, take first slot (`earliestSlot`).
3. If none → `"Fully Booked"` (unchanged).
4. If earliest slot's date === today → `"Available Today"` (unchanged).
5. If earliest slot's date === tomorrow → `"Tomorrow"`.
6. Otherwise → `"Next: [Day], [Mon] [D]"` e.g. `"Next: Thu, Jun 5"`.

**Badge styling for tomorrow/next:**
- Same color treatment as current "Available Soon": `bg-secondary-container/30 text-on-secondary-container border-secondary-container/50`
- Add calendar icon (14×14px, `CalendarIcon` from `@radix-ui/react-icons`) left of text.

---

## 2. Individual Doctor Page (`/doctors/[id]/page.tsx` + `DoctorAbout.tsx`)

### 2a. Hero Section — 3-Tier Hierarchy

Replace the flat pill row with structured tiers:

**Tier 1 — Name + Verified:**
```
Dr. Reyna Dela Cruz  [✓ PRC Verified]
```
- Name: existing `text-3xl font-bold text-white`
- Verified chip: `bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full` with checkmark icon. Only shown when `isVerified`.

**Tier 2 — Specialization + Location:**
```
Cardiologist  ·  Quezon City, NCR
```
- Single line, `text-white/85 text-base font-medium mt-1`
- City and region joined with ` · ` separator; omitted if both absent.

**Tier 3 — Stats Bar:**
Horizontal strip with 4 stat items (or fewer if data absent):
- **Rating** — `★ {avgRating}` sub-label `{reviewCount} reviews`. Hidden if `avgRating` null/0.
- **Experience** — `{yearsOfExperience}+ yrs`. Hidden if null.
- **Fee / session** — `₱{consultationFee}`. Hidden if null.
- **Next available** — earliest available slot date (same logic as 1b). Hidden if no slots.

Styling: `bg-white/12 border border-white/20 rounded-2xl flex mt-5`. Each item: `flex flex-col px-5 py-3 flex-1 border-r border-white/15 last:border-r-0`.
- Stat label: `text-[10px] font-bold uppercase tracking-widest text-white/60`
- Stat value: `text-lg font-bold text-white mt-0.5`
- Stat sub: `text-[11px] text-white/65 mt-0.5`

Remove the existing pill row entirely.

### 2b. Body Content — DoctorAbout.tsx Reorder

New section order (top to bottom):

1. **Credentials card** *(moved to top)*
   - Styled as a teal-tinted card (`bg-primary/5 border border-primary/15 rounded-xl`).
   - Rows with icon + label + value:
     - PRC License No. (if present) + "(Verified ✓)" suffix when `isVerified`
     - Location: city + region (if either present)
     - Languages (if `languagesSpoken.length > 0`)
   - Only rendered if at least one of: `prcLicenseNo`, `city`, `region`, `languagesSpoken.length > 0`.

2. **About** (bio) — unchanged content, unchanged styling.

3. **Specializations & Focus Areas** *(merged into one section)*
   - Heading: `"Specializations & Focus Areas"`
   - Show specialization chips first (primary highlighted), then focus area chips below with a subtle divider if both present.

4. **Patient Reviews** — unchanged.

**Remove** the standalone `Languages` section and `Credentials & Location` section from `DoctorAbout` (content moved to credentials card at top).

---

## 3. Shared Utility

Extract availability computation into a helper `getEarliestAvailability(slots: AvailabilitySlot[]): { status: "today" | "tomorrow" | "date" | "booked", label: string, date?: Date }` — used by both `DoctorCard` and the hero stats bar. Place in `src/lib/availability.ts`.

---

## Out of Scope

- No backend changes.
- No changes to booking panel, filters, sort, or skeleton states.
- No changes to DoctorFilters or DoctorSort.
