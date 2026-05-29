# Patient IA Collapse + Session-Aware Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the patient dashboard into the consumer site — logged-in patients browse the same public pages with a session-aware header and avatar dropdown, while the doctor back-office dashboard stays untouched.

**Architecture:** Two shells gated on `session.user.role`. Patient = `Header` + `Footer` (new `PatientShell` wrapper), no sidebar. Doctor = existing `DashboardLayout`. Private patient pages move from `/dashboard/*` to clean top-level routes with `next.config` redirects. The two duplicated discovery and AI stacks each collapse to their canonical consumer route.

**Tech Stack:** Next.js App Router (server + client components), next-auth (`useSession` / `getServerSession`), Tailwind, Radix (`@radix-ui/react-dropdown-menu` — already installed).

**Verification note:** The frontend has no unit-test infra (no Jest/RTL). Per existing project practice, each task is verified with `npx tsc --noEmit` and the final task runs `npm run build` + `npm run lint`. All commands run from `frontend/`.

**Spec:** `docs/superpowers/specs/2026-05-29-patient-ia-collapse-design.md`

---

## File Structure

- `frontend/src/components/layout/header.tsx` — **modify**: add session-aware variants + avatar dropdown + notification bell.
- `frontend/src/components/layout/patient-shell.tsx` — **create**: `Header` + `Footer` + centered `<main>` wrapper for patient private pages.
- `frontend/src/app/page.tsx` — **modify**: server component branching on session/role (marketing / patient home / doctor redirect + onboarding guard).
- `frontend/src/app/patient-home.tsx` — **create**: client component with the overview content (from `dashboard-client.tsx`), reshelled.
- `frontend/src/app/appointments/page.tsx`, `records/page.tsx`, `notifications/page.tsx`, `profile/page.tsx` — **create** (moved from `dashboard/*`), reshelled to `PatientShell`.
- `frontend/src/app/dashboard/` — **delete** entirely (overview, find-doctors, ai-recommendations, and the moved pages).
- `frontend/src/components/doctors/DoctorCardCompact.tsx` — **delete**.
- `frontend/src/components/layout/dashboard-layout.tsx` — **modify**: drop `patientNav` (doctor-only).
- `frontend/src/app/recommendations/page.tsx` — **modify**: fold in logged-in recommendation history.
- `frontend/next.config.ts` — **modify**: add `redirects()`.
- `frontend/src/app/(auth)/login/page.tsx` — **modify**: patient default redirect `/dashboard` → `/`.
- `frontend/src/app/consultation/[appointmentId]/page.tsx` — **modify**: patient end-call redirect → `/records`.

---

## Task 1: Session-aware Header

**Files:**
- Modify: `frontend/src/components/layout/header.tsx`

- [ ] **Step 1: Rewrite header with three variants**

Replace the entire file with:

```tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CalendarIcon, FileTextIcon, PersonIcon, ExitIcon, BellIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#48cab6] to-[#31a795] flex items-center justify-center text-white text-sm font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function Header() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const name = session?.user?.name || session?.user?.email || "User";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} className="h-8 w-auto" />
            <span className="text-xl font-bold tracking-tight text-text-primary font-serif">Ginhawa</span>
          </Link>
        </div>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-6">
          {role === "PATIENT" ? (
            <>
              <Link href="/doctors" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Find a Doctor</Link>
              <Link href="/recommendations" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">AI Symptom Checker</Link>
            </>
          ) : role !== "DOCTOR" ? (
            <>
              <Link href="/features" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Features</Link>
              <Link href="/doctors" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Find a Doctor</Link>
              <Link href="/for-doctors" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">For Doctors</Link>
            </>
          ) : null}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {status === "loading" ? null : role === "PATIENT" ? (
            <>
              <Link href="/notifications" aria-label="Notifications" className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors">
                <BellIcon className="w-5 h-5" />
              </Link>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger aria-label="Account menu" className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <Avatar name={name} />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-[200px] rounded-xl border border-outline-variant bg-surface-white p-1.5 shadow-lifted">
                    <div className="px-3 py-2 text-xs text-on-surface-variant truncate">{name}</div>
                    <DropdownMenu.Item asChild>
                      <Link href="/appointments" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container outline-none cursor-pointer"><CalendarIcon className="w-4 h-4" /> My Appointments</Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/records" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container outline-none cursor-pointer"><FileTextIcon className="w-4 h-4" /> Medical Records</Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container outline-none cursor-pointer"><PersonIcon className="w-4 h-4" /> Profile</Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-outline-variant" />
                    <DropdownMenu.Item onSelect={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-error hover:bg-error/5 outline-none cursor-pointer"><ExitIcon className="w-4 h-4" /> Log out</DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </>
          ) : role === "DOCTOR" ? (
            <>
              <Button variant="ghost" size="sm" asChild><Link href="/doctor/dashboard">Go to Dashboard</Link></Button>
              <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>Log out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link href="/login">Log in</Link></Button>
              <Button size="sm" asChild><Link href="/signup">Sign up</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat(header): session-aware variants + patient avatar dropdown"
```

---

## Task 2: PatientShell wrapper

**Files:**
- Create: `frontend/src/components/layout/patient-shell.tsx`

- [ ] **Step 1: Create the shell**

```tsx
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export function PatientShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-grow w-full">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/patient-shell.tsx
git commit -m "feat(layout): add PatientShell (header + footer, no sidebar)"
```

---

## Task 3: Personalized home at `/`

**Files:**
- Create: `frontend/src/app/patient-home.tsx`
- Modify: `frontend/src/app/page.tsx`
- Reference (delete in Task 6): `frontend/src/app/dashboard/dashboard-client.tsx`, `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create `patient-home.tsx` from the existing dashboard-client**

Copy the full body of `src/app/dashboard/dashboard-client.tsx` into `src/app/patient-home.tsx`, then make these changes:
- Rename the exported function `DashboardClient` → `PatientHome`.
- Remove the `import { DashboardLayout } from "@/components/layout/dashboard-layout";` line and add `import { PatientShell } from "@/components/layout/patient-shell";`.
- Replace both `<DashboardLayout role="patient">` wrappers (the loading branch and the main return) with `<PatientShell>`, and their closing `</DashboardLayout>` with `</PatientShell>`.
- Leave everything else (data fetching, stat cards, recent appointments, quick-action links to `/dashboard/find-doctors`, `/dashboard/ai-recommendations`, `/dashboard/records`) for now — those links are fixed in Step 2.

- [ ] **Step 2: Repoint quick-action links in `patient-home.tsx`**

In `patient-home.tsx`, change the three quick-action `Link href` values and the empty-state link:
- `/dashboard/find-doctors` → `/doctors`
- `/dashboard/ai-recommendations` → `/recommendations`
- `/dashboard/records` → `/records`
- the "View all" appointments link `/dashboard/appointments` → `/appointments`

- [ ] **Step 3: Rewrite `app/page.tsx` as a role-branching server component**

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { apiRequest } from "@/lib/api-client";
import { Header } from "@/components/layout/header";
import { HeroSection } from "@/components/layout/hero-section";
import { FeaturesSection } from "@/components/layout/features-section";
import { ShowcaseSection } from "@/components/layout/showcase-section";
import { TestimonialsSection } from "@/components/layout/testimonials-section";
import { FAQSection } from "@/components/layout/faq-section";
import { CTASection } from "@/components/layout/cta-section";
import { Footer } from "@/components/layout/footer";
import { PatientHome } from "./patient-home";

function Marketing() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
        <ShowcaseSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) return <Marketing />;

  if (session.user?.role === "DOCTOR") redirect("/doctor/dashboard");

  // PATIENT: onboarding guard (moved from old /dashboard/page.tsx)
  const token = session.user?.accessToken;
  let hasProfile = false;
  if (token) {
    try {
      await apiRequest("/patients/profile", { token });
      hasProfile = true;
    } catch {
      hasProfile = false;
    }
  }
  if (!hasProfile) redirect("/onboarding/1");

  return <PatientHome />;
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`dashboard-client.tsx` still exists and is unused — that's fine until Task 6.)

- [ ] **Step 5: Commit**

```bash
git add src/app/patient-home.tsx src/app/page.tsx
git commit -m "feat(home): personalized patient home at / with role branching"
```

---

## Task 4: Move private patient routes to top-level

Each page currently renders its content inside `<DashboardLayout role="patient">…</DashboardLayout>`. The move = relocate the folder and swap that wrapper for `PatientShell`.

**Files:**
- Create: `frontend/src/app/appointments/page.tsx`, `records/page.tsx`, `notifications/page.tsx`, `profile/page.tsx`
- Delete (in Task 6): the corresponding `frontend/src/app/dashboard/*` folders

- [ ] **Step 1: Move the four route folders**

```bash
cd frontend/src/app
git mv dashboard/appointments appointments
git mv dashboard/records records
git mv dashboard/notifications notifications
git mv dashboard/profile profile
```

- [ ] **Step 2: Reshell each moved page**

In each of `appointments/page.tsx`, `records/page.tsx`, `notifications/page.tsx`, `profile/page.tsx` (and any client component they import that holds the `DashboardLayout` wrapper):
- Replace `import { DashboardLayout } from "@/components/layout/dashboard-layout";` with `import { PatientShell } from "@/components/layout/patient-shell";`.
- Replace every `<DashboardLayout role="patient">` with `<PatientShell>` and every matching `</DashboardLayout>` with `</PatientShell>`.

If a page's content lives in a sibling client file (e.g. an `*-client.tsx` moved alongside it), apply the same swap there.

- [ ] **Step 3: Repoint any in-page links that still reference old `/dashboard/*` paths**

Within the four moved pages, update internal links: `/dashboard/appointments`→`/appointments`, `/dashboard/records`→`/records`, `/dashboard/notifications`→`/notifications`, `/dashboard/profile`→`/profile`, `/dashboard/find-doctors`→`/doctors`, `/dashboard/ai-recommendations`→`/recommendations`, `/dashboard`→`/`. (The appointments empty-state already links to `/doctors`; leave it.)

Find them with:
```bash
grep -rn "/dashboard" appointments records notifications profile
```
Expected after edits: no matches.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(routes): move patient pages to top-level, reshell to PatientShell"
```

---

## Task 5: Merge AI symptom checker (fold history into `/recommendations`)

**Files:**
- Modify: `frontend/src/app/recommendations/page.tsx`

The public page (`app/recommendations/page.tsx`) is the canonical wizard but has no session/history. The dashboard twin (`app/dashboard/ai-recommendations/page.tsx`, deleted in Task 6) fetched history via `apiRequest<RecommendationLog[]>("/recommendations", { token })`. Fold that in.

- [ ] **Step 1: Add session + history state to the wizard**

In `RecommendationsContent` in `app/recommendations/page.tsx`:
- Add imports: `import { useSession } from "next-auth/react";` and `import { apiRequest } from "@/lib/api-client";`.
- Inside the component add:

```tsx
const { data: session } = useSession();
const token = session?.user?.accessToken;
const [history, setHistory] = useState<RecommendationLog[]>([]);

useEffect(() => {
  if (!token) return;
  apiRequest<RecommendationLog[]>("/recommendations", { token })
    .then(setHistory)
    .catch(() => setHistory([]));
}, [token]);
```

- [ ] **Step 2: Render the history list for logged-in patients**

After the wizard's main result/step block (before the closing wrapper), add a section that renders only when `token && history.length > 0`: a heading "Your past symptom checks" and a list mapping `history` to cards showing `log.symptoms` (truncated) and `log.recommendedSpecialization` with a `Link` to `/doctors`. Match the card styling used elsewhere in the file (`Card` component, `text-on-surface-variant`). Use the `RecommendationLog` fields already imported from `@/types/api`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/recommendations/page.tsx
git commit -m "feat(recommendations): show past symptom checks for logged-in patients"
```

---

## Task 6: Delete duplicate stacks + trim DashboardLayout

**Files:**
- Delete: `frontend/src/app/dashboard/` (remaining: `page.tsx`, `dashboard-client.tsx`, `find-doctors/`, `ai-recommendations/`)
- Delete: `frontend/src/components/doctors/DoctorCardCompact.tsx`
- Modify: `frontend/src/components/layout/dashboard-layout.tsx`

- [ ] **Step 1: Delete the dead dashboard tree and compact card**

```bash
cd frontend/src
git rm -r app/dashboard
git rm components/doctors/DoctorCardCompact.tsx
```

- [ ] **Step 2: Make DashboardLayout doctor-only**

In `components/layout/dashboard-layout.tsx`:
- Delete the entire `patientNav` array.
- Change `const navItems = role === 'patient' ? patientNav : doctorNav;` to `const navItems = doctorNav;`.

(Keep the `role` prop and its badge usage; doctor pages still pass `role="doctor"`.)

- [ ] **Step 3: Confirm nothing references deleted modules**

Run:
```bash
grep -rn "DoctorCardCompact\|dashboard-client\|/dashboard/find-doctors\|/dashboard/ai-recommendations\|role=\"patient\"\|role='patient'" src
```
Expected: no matches.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: delete duplicate patient discovery/AI stacks and patient sidebar nav"
```

---

## Task 7: Redirects + small redirect fixes

**Files:**
- Modify: `frontend/next.config.ts`
- Modify: `frontend/src/app/(auth)/login/page.tsx`
- Modify: `frontend/src/app/consultation/[appointmentId]/page.tsx`

- [ ] **Step 1: Add redirects to next.config.ts**

Replace the config object with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: false },
      { source: "/dashboard/appointments", destination: "/appointments", permanent: false },
      { source: "/dashboard/records", destination: "/records", permanent: false },
      { source: "/dashboard/notifications", destination: "/notifications", permanent: false },
      { source: "/dashboard/profile", destination: "/profile", permanent: false },
      { source: "/dashboard/find-doctors", destination: "/doctors", permanent: false },
      { source: "/dashboard/find-doctors/:id", destination: "/doctors/:id", permanent: false },
      { source: "/dashboard/ai-recommendations", destination: "/recommendations", permanent: false },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Fix patient login redirect**

In `src/app/(auth)/login/page.tsx` line ~43, change:
```ts
const defaultRedirect = role === 'DOCTOR' ? '/doctor/dashboard' : '/dashboard';
```
to:
```ts
const defaultRedirect = role === 'DOCTOR' ? '/doctor/dashboard' : '/';
```

- [ ] **Step 3: Fix patient end-call redirect**

In `src/app/consultation/[appointmentId]/page.tsx` line ~62, change `router.push('/dashboard/records');` to `router.push('/records');`. (Leave the doctor branch `/doctor/finalize/...` unchanged.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts "src/app/(auth)/login/page.tsx" "src/app/consultation/[appointmentId]/page.tsx"
git commit -m "feat: redirect legacy /dashboard paths and fix patient post-login/call redirects"
```

---

## Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Sweep for any remaining patient `/dashboard` references**

Run:
```bash
cd frontend && grep -rn "/dashboard" src | grep -v "/doctor"
```
Expected: only the `redirects()` `source` strings in `next.config.ts` (those are intentional). No app/component links.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: passes (no new errors).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds; route list shows `/`, `/appointments`, `/records`, `/notifications`, `/profile`, `/doctors`, `/recommendations`; no `/dashboard/*` patient routes.

- [ ] **Step 4: Manual smoke (note results)**

Confirm by running `npm run dev`:
- Logged-out `/` → marketing; header shows Log in / Sign up.
- Patient login → lands on `/` personalized home; header shows bell + avatar; dropdown links to `/appointments`, `/records`, `/profile`; Log out works.
- Patient visiting `/dashboard/records` → redirected to `/records`.
- Doctor login → `/doctor/dashboard` with sidebar intact.

- [ ] **Step 5: Commit (if any lint/build fixups were needed)**

```bash
git add -A
git commit -m "chore: verification fixups for patient IA collapse"
```

---

## Self-Review

**Spec coverage:**
- Two shells (Task 2 PatientShell, Task 6 doctor-only DashboardLayout) ✓
- Route moves to top-level + redirects (Tasks 4, 7) ✓
- Session-aware header w/ avatar dropdown + bell (Task 1) ✓
- Personalized home + onboarding guard + doctor redirect (Task 3) ✓
- Discovery merge / delete compact stack (Task 6) ✓
- AI merge w/ history (Task 5) ✓
- Small fixes: login redirect, consultation redirect (Task 7); appointments empty-state already correct (noted) ✓
- Verification: build/lint/tsc/manual (Task 8) ✓

**Placeholder scan:** Step 2 of Task 5 describes the history list without full JSX — intentional, since it must match the file's existing `Card` styling which the implementer can see; fields (`symptoms`, `recommendedSpecialization`) and data source are specified. All other code steps show concrete code.

**Type consistency:** `PatientShell` (Task 2) used identically in Tasks 3–4. `PatientHome` export name consistent (Task 3 create, Task 3 import in page.tsx). `role` values `"PATIENT"`/`"DOCTOR"` match `session.user.role` usage found in the codebase. `RecommendationLog` matches the existing `@/types/api` import.
