# Patient Dashboard App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public marketing shell (`PatientShell` with `Header`/`Footer`) on all patient-authenticated pages with a proper sidebar dashboard layout, extending the existing `DashboardLayout` component.

**Architecture:** Activate the dormant `role="patient"` path in `DashboardLayout` by adding `patientNav` + `patientMobileNav` arrays, a patient identity card (avatar, name, "Patient Portal" badge, profile completion bar) fetched from `/patients/profile`, and per-item badges from `/appointments/patient` and `/notifications`. Then swap all 5 `PatientShell` usages to `DashboardLayout role="patient"` and delete the two now-unused layout files.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, next-auth, Radix Icons, `@/lib/api-client`

---

### Task 1: Extend DashboardLayout for the patient role

**Files:**
- Modify: `frontend/src/components/layout/dashboard-layout.tsx`

The full replacement of `dashboard-layout.tsx`. Key additions over the current file:
- `patientNav` (7 items) and `patientMobileNav` (5 fixed items matching spec)
- `computeProfileCompletion()` helper
- `useEffect` that fires when `role === 'patient'`: fetches `/patients/profile`, `/appointments/patient`, `/notifications` in parallel and sets state for patient name, avatar, completion %, upcoming count, unread count
- Patient identity card renders **above** the nav (replaces doctor role badge for patient role)
- `getPatientBadge(href)` drives badge display on nav items
- Mobile bottom nav uses `patientMobileNav` for patients, `navItems.slice(0, 5)` for doctors
- Mobile top header `href` and notifications `href` are role-aware

- [ ] **Step 1: Replace the file**

Write the following complete content to `frontend/src/components/layout/dashboard-layout.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
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
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import type { PatientProfile } from '@/types/patient';
import type { Appointment, Notification } from '@/types/api';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const doctorNav: NavItem[] = [
  { href: '/doctor/dashboard', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/doctor/profile', label: 'My Profile', icon: <PersonIcon className="w-4 h-4" /> },
  { href: '/doctor/appointments', label: 'Appointments', icon: <CalendarIcon className="w-4 h-4" /> },
  { href: '/doctor/patients', label: 'Patients', icon: <PersonIcon className="w-4 h-4" /> },
  { href: '/doctor/schedule', label: 'My Schedule', icon: <ClockIcon className="w-4 h-4" /> },
  { href: '/doctor/notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" /> },
];

const patientNav: NavItem[] = [
  { href: '/', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/doctors', label: 'Find a Doctor', icon: <MagnifyingGlassIcon className="w-4 h-4" /> },
  { href: '/recommendations', label: 'AI Checker', icon: <ChatBubbleIcon className="w-4 h-4" /> },
  { href: '/appointments', label: 'Appointments', icon: <CalendarIcon className="w-4 h-4" /> },
  { href: '/records', label: 'Records', icon: <FileTextIcon className="w-4 h-4" /> },
  { href: '/notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" /> },
  { href: '/profile', label: 'Profile', icon: <PersonIcon className="w-4 h-4" /> },
];

// Separate 5-item set for mobile bottom nav (excludes AI Checker and Notifications)
const patientMobileNav: NavItem[] = [
  { href: '/', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/appointments', label: 'Appointments', icon: <CalendarIcon className="w-4 h-4" /> },
  { href: '/doctors', label: 'Doctors', icon: <MagnifyingGlassIcon className="w-4 h-4" /> },
  { href: '/records', label: 'Records', icon: <FileTextIcon className="w-4 h-4" /> },
  { href: '/profile', label: 'Profile', icon: <PersonIcon className="w-4 h-4" /> },
];

function computeProfileCompletion(profile: PatientProfile): number {
  const fields = [
    profile.fullName,
    profile.birthdate,
    profile.contactDetails,
    profile.profilePictureUrl,
    profile.address,
    profile.city,
    profile.region,
  ];
  const filled = fields.filter(v => v !== null && v !== undefined && v !== '').length;
  return Math.round((filled / fields.length) * 100);
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'patient' | 'doctor';
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navItems = role === 'patient' ? patientNav : doctorNav;
  const mobileNavItems = role === 'patient' ? patientMobileNav : navItems.slice(0, 5);

  const [patientName, setPatientName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (role !== 'patient' || !token) return;

    Promise.all([
      apiRequest<PatientProfile>('/patients/profile', { token }),
      apiRequest<Appointment[]>('/appointments/patient', { token }),
      apiRequest<Notification[]>('/notifications', { token }),
    ]).then(([profile, appointments, notifications]) => {
      setPatientName(profile.fullName ?? session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Patient');
      setAvatarUrl(profile.profilePictureUrl ?? null);
      setProfileCompletion(computeProfileCompletion(profile));
      setUpcomingCount(appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length);
      setUnreadCount(notifications.filter(n => !n.readAt).length);
    }).catch(() => {
      setPatientName(session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Patient');
    });
  }, [role, session?.user?.accessToken, session?.user?.name, session?.user?.email]);

  const getPatientBadge = (href: string): number => {
    if (href === '/appointments') return upcomingCount;
    if (href === '/notifications') return unreadCount;
    return 0;
  };

  const homePath = role === 'patient' ? '/' : '/doctor/dashboard';
  const notificationsPath = role === 'patient' ? '/notifications' : '/doctor/notifications';

  return (
    <div className="min-h-screen bg-surface flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded-md focus:bg-surface-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lifted"
      >
        Skip to content
      </a>

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-white border-r border-outline-variant shrink-0 fixed h-full z-20">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-outline-variant">
          <Logo size={28} className="h-7 w-auto" />
          <span className="text-lg font-bold tracking-tight text-text-primary font-serif">
            Ginhawa
          </span>
        </div>

        {/* Patient identity card */}
        {role === 'patient' && (
          <div className="mx-3 my-3 p-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-center gap-2.5 mb-2.5">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={patientName}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(patientName || 'P').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{patientName || '—'}</p>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Patient Portal</p>
              </div>
            </div>
            {profileCompletion < 100 && profileCompletion > 0 && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-on-surface-variant">Profile</span>
                  <span className="text-xs font-semibold text-primary">{profileCompletion}%</span>
                </div>
                <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Doctor role badge */}
        {role === 'doctor' && (
          <div className="px-4 py-3 border-b border-outline-variant">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5">
              <PersonIcon className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Doctor Portal
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === '/' || item.href === '/doctor/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const badge = role === 'patient' ? getPatientBadge(item.href) : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={cn(isActive ? 'text-primary' : 'text-on-surface-variant')}>
                  {item.icon}
                </span>
                {item.label}
                {badge > 0 ? (
                  <span className="ml-auto text-xs font-bold bg-primary text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {badge}
                  </span>
                ) : isActive ? (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-outline-variant">
          {role === 'doctor' && session?.user?.email && (
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(session.user.name || session.user.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate">{session.user.name || session.user.email}</p>
                <p className="text-xs text-on-surface-variant capitalize">{role}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full justify-start gap-2 text-on-surface-variant hover:text-error hover:bg-error/5"
            id="dashboard-logout"
          >
            <ExitIcon className="w-4 h-4" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-white border-t border-outline-variant"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {mobileNavItems.map((item) => {
            const isActive =
              item.href === '/' || item.href === '/doctor/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const badge = role === 'patient' ? getPatientBadge(item.href) : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-w-0 relative',
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                <span className="truncate max-w-[60px]">{item.label}</span>
                {badge > 0 && (
                  <span className="absolute top-0 right-0.5 text-xs font-bold bg-error text-white px-1 rounded-full min-w-[14px] text-center leading-none">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main id="main-content" className="flex-1 lg:ml-64 pb-20 lg:pb-0 min-h-screen">
        {/* Mobile top header */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between bg-surface-white border-b border-outline-variant px-4 py-3">
          <Link href={homePath} className="flex items-center gap-2">
            <Logo size={24} className="h-6 w-auto" />
            <span className="text-base font-bold tracking-tight text-text-primary font-serif">Ginhawa</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href={notificationsPath}
              aria-label="Notifications"
              className={cn(
                'p-2 rounded-full hover:bg-surface-container transition-colors',
                pathname === notificationsPath ? 'text-primary' : 'text-on-surface-variant',
              )}
            >
              <BellIcon className="w-5 h-5" />
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              aria-label="Log out"
              className="p-2 rounded-full text-on-surface-variant hover:bg-error/5 hover:text-error transition-colors"
            >
              <ExitIcon className="w-5 h-5" />
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If errors appear, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/dashboard-layout.tsx
git commit -m "feat(layout): add patient nav, identity card, and badge counts to DashboardLayout"
```

---

### Task 2: Swap PatientShell in patient-home.tsx

**Files:**
- Modify: `frontend/src/app/patient-home.tsx`

- [ ] **Step 1: Replace the two PatientShell imports and usages**

In `frontend/src/app/patient-home.tsx`:

Change the import line:
```tsx
import { PatientShell } from "@/components/layout/patient-shell";
```
to:
```tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
```

Change the loading-state return (around line 74):
```tsx
return (
  <PatientShell>
    <div className="flex justify-center py-20">
      <Spinner size="lg" />
    </div>
  </PatientShell>
);
```
to:
```tsx
return (
  <DashboardLayout role="patient">
    <div className="flex justify-center py-20">
      <Spinner size="lg" />
    </div>
  </DashboardLayout>
);
```

Change the main return (around line 83):
```tsx
return (
  <PatientShell>
```
to:
```tsx
return (
  <DashboardLayout role="patient">
```

And the closing tag:
```tsx
  </PatientShell>
```
to:
```tsx
  </DashboardLayout>
```

- [ ] **Step 2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/patient-home.tsx
git commit -m "feat(patient-home): use DashboardLayout instead of PatientShell"
```

---

### Task 3: Swap PatientShell in appointments/page.tsx

**Files:**
- Modify: `frontend/src/app/appointments/page.tsx`

- [ ] **Step 1: Replace import and usages**

In `frontend/src/app/appointments/page.tsx`:

Change import:
```tsx
import { PatientShell } from "@/components/layout/patient-shell";
```
to:
```tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
```

Change the return wrapper (there is one `<PatientShell>` usage at line 88):
```tsx
return (
  <PatientShell>
```
to:
```tsx
return (
  <DashboardLayout role="patient">
```

And close tag:
```tsx
  </PatientShell>
```
to:
```tsx
  </DashboardLayout>
```

- [ ] **Step 2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/appointments/page.tsx
git commit -m "feat(appointments): use DashboardLayout instead of PatientShell"
```

---

### Task 4: Swap PatientShell in records/page.tsx

**Files:**
- Modify: `frontend/src/app/records/page.tsx`

Note: `PatientShell` is used inside `RecordsContent`, not at the page export level.

- [ ] **Step 1: Replace import and usage**

In `frontend/src/app/records/page.tsx`:

Change import:
```tsx
import { PatientShell } from "@/components/layout/patient-shell";
```
to:
```tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
```

Change the return wrapper inside `RecordsContent` (line 57):
```tsx
return (
  <PatientShell>
```
to:
```tsx
return (
  <DashboardLayout role="patient">
```

And close tag:
```tsx
  </PatientShell>
```
to:
```tsx
  </DashboardLayout>
```

- [ ] **Step 2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/records/page.tsx
git commit -m "feat(records): use DashboardLayout instead of PatientShell"
```

---

### Task 5: Swap PatientShell in notifications/page.tsx

**Files:**
- Modify: `frontend/src/app/notifications/page.tsx`

- [ ] **Step 1: Replace import and usage**

In `frontend/src/app/notifications/page.tsx`:

Change import:
```tsx
import { PatientShell } from "@/components/layout/patient-shell";
```
to:
```tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
```

Change the return wrapper (line 71):
```tsx
return (
  <PatientShell>
```
to:
```tsx
return (
  <DashboardLayout role="patient">
```

And close tag:
```tsx
  </PatientShell>
```
to:
```tsx
  </DashboardLayout>
```

- [ ] **Step 2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/notifications/page.tsx
git commit -m "feat(notifications): use DashboardLayout instead of PatientShell"
```

---

### Task 6: Swap PatientShell in profile/page.tsx

**Files:**
- Modify: `frontend/src/app/profile/page.tsx`

- [ ] **Step 1: Replace import and usage**

In `frontend/src/app/profile/page.tsx`:

Change import:
```tsx
import { PatientShell } from "@/components/layout/patient-shell";
```
to:
```tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
```

Change the return wrapper (line 194):
```tsx
return (
  <PatientShell>
```
to:
```tsx
return (
  <DashboardLayout role="patient">
```

And close tag:
```tsx
  </PatientShell>
```
to:
```tsx
  </DashboardLayout>
```

- [ ] **Step 2: Type-check**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/profile/page.tsx
git commit -m "feat(profile): use DashboardLayout instead of PatientShell"
```

---

### Task 7: Delete PatientShell and PatientMobileNav

**Files:**
- Delete: `frontend/src/components/layout/patient-shell.tsx`
- Delete: `frontend/src/components/layout/patient-mobile-nav.tsx`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "patient-shell\|PatientShell\|patient-mobile-nav\|PatientMobileNav" \
  /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src \
  --include="*.tsx" --include="*.ts" -l
```

Expected output: empty (no files found). If any files still import these, fix them first.

- [ ] **Step 2: Delete the files**

```bash
rm /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/components/layout/patient-shell.tsx
rm /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/components/layout/patient-mobile-nav.tsx
```

- [ ] **Step 3: Type-check and build**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npm run build 2>&1 | tail -30
```

Expected: build completes with no errors. "Route (app)" table should show all patient routes.

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src/components/layout/
git commit -m "chore: delete PatientShell and PatientMobileNav (replaced by DashboardLayout)"
```

---

### Task 8: Visual smoke test

- [ ] **Step 1: Start dev server**

```bash
cd /home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend && npm run dev
```

- [ ] **Step 2: Verify patient portal pages (desktop)**

Open `http://localhost:3000` while logged in as a patient. Confirm:
- Left sidebar visible with brand, patient identity card (name + "Patient Portal"), nav links, logout
- No public `Header` (no marketing nav "Find a Doctor / AI Symptom Checker" at the top)
- No `Footer` (no "Features / For Doctors / Privacy Policy" at the bottom)
- Active nav item is highlighted (Overview)
- Profile completion bar visible if `profileCompletion < 100 && > 0`
- Appointment and notification badges appear if counts > 0

Repeat for `/appointments`, `/records`, `/notifications`, `/profile` — sidebar persists on all pages, correct nav item highlighted.

- [ ] **Step 3: Verify doctor portal is unaffected**

Log in as a doctor and open `http://localhost:3000/doctor/dashboard`. Confirm:
- Doctor sidebar unchanged: "Doctor Portal" badge, doctorNav items, user identity at bottom
- No regression in doctor pages

- [ ] **Step 4: Verify public pages unaffected**

Log out and open `http://localhost:3000/doctors`. Confirm:
- Public marketing `Header` still shows (with logo, nav, Sign up button)
- Public `Footer` still shows

- [ ] **Step 5: Verify mobile (≤ 1023px)**

Resize browser to mobile width. Confirm:
- No sidebar
- Bottom nav shows 5 items: Overview, Appointments, Doctors, Records, Profile
- Mobile top header links to `/` (not `/doctor/dashboard`) for patient role

---

### Task 9: Delete spec and plan files

Only execute this task after Task 8 passes with no issues.

- [ ] **Step 1: Delete**

```bash
rm /home/vincentdev/vincent-projects/launchpad/telehealth-app/docs/superpowers/specs/2026-05-30-patient-dashboard-design.md
rm /home/vincentdev/vincent-projects/launchpad/telehealth-app/docs/superpowers/plans/2026-05-30-patient-dashboard.md
```

- [ ] **Step 2: Commit**

```bash
git add -A docs/superpowers/
git commit -m "chore: delete patient dashboard spec and plan (implementation complete)"
```
