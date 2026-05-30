# Real-time Push Notifications (SSE) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push new `Notification` rows to the browser live (toast + unread badge + list) via Server-Sent Events, replacing today's fetch-once-on-mount staleness.

**Architecture:** A single in-memory RxJS `Subject` in `NotificationsService` is fed by the one `createNotification` chokepoint. A NestJS `@Sse('stream')` endpoint filters that stream per-user. The frontend opens ONE `fetchEventSource` connection inside a `NotificationProvider` mounted in `DashboardLayout`; it connects-first-then-seeds, dedups by id, fires `sonner` toasts, and degrades silently (error boundary + seeded fallback) so it can never white-screen the dashboard.

**Tech Stack:** NestJS, RxJS (already present), Prisma; Next.js, React context, `@microsoft/fetch-event-source`, `sonner`, vitest, jest.

**Single-instance only:** the in-memory `Subject` reaches every client because all SSE connections live in one Railway container. If ever scaled to multiple replicas, swap the `Subject` for Postgres `LISTEN/NOTIFY` or Redis pub/sub. This is captured as a code comment in Task 1.

---

## File Structure

**Backend**
- Modify: `backend/src/notifications/notifications.service.ts` — add `stream$` Subject, emit in `createNotification`, add `streamForUser`.
- Modify: `backend/src/notifications/notifications.controller.ts` — add `@Sse('stream')` endpoint.
- Modify: `backend/src/notifications/notifications.service.spec.ts` — cover emit + filter.
- Create: `backend/src/notifications/notifications.controller.spec.ts` — cover stream endpoint wiring.

**Frontend**
- Create: `frontend/src/providers/notification-provider.tsx` — context, ONE SSE connection, toast, error boundary, silent degrade.
- Create: `frontend/src/providers/notification-provider.test.tsx` — toast + dedup + degrade.
- Modify: `frontend/src/components/layout/dashboard-layout.tsx` — mount provider + `<Toaster/>`, read `unreadCount` from context.
- Modify: `frontend/src/hooks/use-patient-sidebar-data.ts` — drop its `/notifications` fetch + `unreadCount`.
- Modify: `frontend/src/app/notifications/page.tsx` — consume context.
- Modify: `frontend/src/app/doctor/notifications/page.tsx` — consume context.

---

## Task 1: Backend — stream Subject + per-user stream

**Files:**
- Modify: `backend/src/notifications/notifications.service.ts`
- Test: `backend/src/notifications/notifications.service.spec.ts`

- [ ] **Step 1: Add failing tests for emit + filter**

Append these two `describe` blocks inside the top-level `describe('NotificationsService', ...)` in `notifications.service.spec.ts` (after the existing `createNotification` block):

```ts
  describe('stream$', () => {
    it('emits the created notification on the stream', async () => {
      const row = { id: 'n-1', userId: 'user-1' };
      mockPrismaService.notification.create.mockResolvedValue(row);
      const spy = jest.fn();
      const sub = (service as unknown as { stream$: { subscribe: (f: (v: unknown) => void) => { unsubscribe: () => void } } })
        .stream$.subscribe(spy);

      await service.createNotification(
        'user-1',
        NotificationType.APPOINTMENT_CONFIRMED,
        't',
        'm',
      );

      expect(spy).toHaveBeenCalledWith(row);
      sub.unsubscribe();
    });
  });

  describe('streamForUser', () => {
    it('emits only the target user notifications, JSON-encoded', (done) => {
      const sub = service.streamForUser('user-1').subscribe((event) => {
        expect(event.type).toBe('notification');
        expect(JSON.parse(event.data as string).id).toBe('n-1');
        sub.unsubscribe();
        done();
      });

      const stream$ = (service as unknown as { stream$: { next: (v: unknown) => void } }).stream$;
      stream$.next({ id: 'n-2', userId: 'user-2' }); // filtered out
      stream$.next({ id: 'n-1', userId: 'user-1' }); // delivered
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/notifications/notifications.service.spec.ts -t "stream"`
Expected: FAIL — `service.streamForUser is not a function` / `stream$` undefined.

- [ ] **Step 3: Implement stream$ + streamForUser**

Replace the full contents of `notifications.service.ts` with:

```ts
import { Injectable, NotFoundException, MessageEvent } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { NotificationType, Notification } from '@prisma/client';
import { Subject, merge, interval, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable()
export class NotificationsService {
  // Single-instance only: every SSE client lives in this one process, so an
  // in-memory Subject reaches them all. If ever scaled to multiple replicas,
  // replace this with Postgres LISTEN/NOTIFY or Redis pub/sub so all instances
  // hear every event.
  private readonly stream$ = new Subject<Notification>();

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message },
    });
    this.stream$.next(notification);
    return notification;
  }

  /**
   * Per-user SSE stream. Heartbeat ping every 30s keeps the Railway proxy from
   * idling the connection closed; real notifications are JSON-encoded.
   */
  streamForUser(userId: string): Observable<MessageEvent> {
    const heartbeat$ = interval(30000).pipe(
      map((): MessageEvent => ({ type: 'ping', data: 'ping' })),
    );
    const notifications$ = this.stream$.pipe(
      filter((n) => n.userId === userId),
      map((n): MessageEvent => ({ type: 'notification', data: JSON.stringify(n) })),
    );
    return merge(heartbeat$, notifications$);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/notifications/notifications.service.spec.ts`
Expected: PASS (all blocks, including pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add backend/src/notifications/notifications.service.ts backend/src/notifications/notifications.service.spec.ts
git commit -m "feat(notifications): emit created notifications on per-user SSE stream"
```

---

## Task 2: Backend — @Sse('stream') endpoint

**Files:**
- Modify: `backend/src/notifications/notifications.controller.ts`
- Test: `backend/src/notifications/notifications.controller.spec.ts` (create)

- [ ] **Step 1: Write the failing controller test**

Create `backend/src/notifications/notifications.controller.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockService = {
    findAllForUser: jest.fn(),
    markAsRead: jest.fn(),
    streamForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile();
    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  it("returns the authed user's SSE stream", () => {
    const stream = of({ type: 'notification', data: '{}' });
    mockService.streamForUser.mockReturnValue(stream);

    const result = controller.stream({ user: { id: 'user-1' } });

    expect(mockService.streamForUser).toHaveBeenCalledWith('user-1');
    expect(result).toBe(stream);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/notifications/notifications.controller.spec.ts`
Expected: FAIL — `controller.stream is not a function`.

- [ ] **Step 3: Add the @Sse endpoint**

Replace the full contents of `notifications.controller.ts` with:

```ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Sse,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAllForUser(@Request() req: { user: { id: string } }) {
    return this.notificationsService.findAllForUser(req.user.id);
  }

  // NOTE: JwtAuthGuard runs only at connect time. A long-lived SSE connection
  // outlives its JWT; mid-stream expiry is accepted for the MVP (no refresh).
  @Sse('stream')
  stream(@Request() req: { user: { id: string } }) {
    return this.notificationsService.streamForUser(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }
}
```

- [ ] **Step 4: Run test + full backend suite**

Run: `cd backend && npx jest src/notifications && npm run build`
Expected: PASS; build succeeds (no TS errors).

- [ ] **Step 5: Commit**

```bash
git add backend/src/notifications/notifications.controller.ts backend/src/notifications/notifications.controller.spec.ts
git commit -m "feat(notifications): add GET /notifications/stream SSE endpoint"
```

---

## Task 3: Frontend — install dependencies

**Files:**
- Modify: `frontend/package.json` (via npm)

- [ ] **Step 1: Install**

Run:
```bash
cd frontend && npm install sonner @microsoft/fetch-event-source
```
Expected: both added to `dependencies`.

- [ ] **Step 2: Verify build still clean**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add sonner + fetch-event-source for live notifications"
```

---

## Task 4: Frontend — NotificationProvider

**Files:**
- Create: `frontend/src/providers/notification-provider.tsx`
- Test: `frontend/src/providers/notification-provider.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/providers/notification-provider.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NotificationRoot, useNotifications } from './notification-provider';

// Capture the options passed to fetchEventSource so the test can drive onmessage.
let sseOptions: { onmessage?: (ev: { event: string; data: string }) => void } = {};
vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: vi.fn((_url: string, opts: typeof sseOptions) => {
    sseOptions = opts;
    return new Promise(() => {}); // stays "connected"
  }),
}));

const toast = vi.fn();
vi.mock('sonner', () => ({ toast: (...a: unknown[]) => toast(...a) }));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { accessToken: 'tok' } } }),
}));

const seed = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiRequest: (...a: unknown[]) => seed(...a),
}));

function Probe() {
  const { notifications, unreadCount } = useNotifications();
  return (
    <div>
      <span data-testid="count">{unreadCount}</span>
      <ul>{notifications.map((n) => <li key={n.id}>{n.title}</li>)}</ul>
    </div>
  );
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    sseOptions = {};
    toast.mockClear();
    seed.mockReset();
  });

  it('toasts and lists a pushed notification, deduped against the seed', async () => {
    seed.mockResolvedValue([
      { id: 'n-1', userId: 'u', type: 'GENERAL', title: 'Seeded', message: 'm', createdAt: '', readAt: '2020-01-01' },
    ]);

    render(<NotificationRoot><Probe /></NotificationRoot>);

    // Seed arrives (read) → unreadCount 0.
    await waitFor(() => expect(screen.getByText('Seeded')).toBeInTheDocument());
    expect(screen.getByTestId('count').textContent).toBe('0');

    // Push the SAME id again (overlap) + a new unread one.
    sseOptions.onmessage?.({ event: 'notification', data: JSON.stringify({ id: 'n-1', userId: 'u', type: 'GENERAL', title: 'Seeded', message: 'm', createdAt: '', readAt: '2020-01-01' }) });
    sseOptions.onmessage?.({ event: 'notification', data: JSON.stringify({ id: 'n-2', userId: 'u', type: 'APPOINTMENT_BOOKED', title: 'Booked', message: 'm2', createdAt: '', readAt: null }) });

    await waitFor(() => expect(screen.getByText('Booked')).toBeInTheDocument());
    // 'Seeded' still appears exactly once (deduped), unread now 1.
    expect(screen.getAllByText('Seeded')).toHaveLength(1);
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(toast).toHaveBeenCalledWith('Booked', { description: 'm2' });
  });

  it('ignores heartbeat ping events', () => {
    seed.mockResolvedValue([]);
    render(<NotificationRoot><Probe /></NotificationRoot>);
    sseOptions.onmessage?.({ event: 'ping', data: 'ping' });
    expect(toast).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/providers/notification-provider.test.tsx`
Expected: FAIL — module `./notification-provider` not found.

- [ ] **Step 3: Implement the provider**

Create `frontend/src/providers/notification-provider.tsx`:

```tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api-client';
import type { Notification } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  appointmentTick: number;
}

// Safe default: consumers keep working even when the provider never mounts
// (error-boundary fallback below renders children outside the provider).
const EMPTY: NotificationContextValue = {
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  appointmentTick: 0,
};

const NotificationContext = createContext<NotificationContextValue>(EMPTY);

export function useNotifications() {
  return useContext(NotificationContext);
}

/** Thrown from onopen on 401/403 so fetch-event-source stops retrying. */
class FatalError extends Error {}

function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [appointmentTick, setAppointmentTick] = useState(0);

  // Prepend incoming, drop duplicates by id — makes connect-first safe.
  const upsert = (incoming: Notification[]) =>
    setNotifications((prev) => {
      const seen = new Set(incoming.map((n) => n.id));
      return [...incoming, ...prev.filter((n) => !seen.has(n.id))];
    });

  useEffect(() => {
    if (!token) return;
    const ctrl = new AbortController();

    // Connect FIRST, then seed: an event firing in the gap is not lost because
    // upsert() dedups by id. A failed connection degrades silently — the seed
    // GET still populates and the dashboard keeps working.
    fetchEventSource(`${BASE_URL}/notifications/stream`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
      openWhenHidden: true,
      async onopen(res) {
        if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
          return; // connected
        }
        if (res.status === 401 || res.status === 403) {
          throw new FatalError(); // expired/invalid token: stop, do not hammer
        }
        throw new Error('retriable'); // transient: allow retry
      },
      onmessage(ev) {
        if (ev.event !== 'notification') return; // ignore heartbeat ping
        const notif = JSON.parse(ev.data) as Notification;
        upsert([notif]);
        toast(notif.title, { description: notif.message });
        if (notif.type.startsWith('APPOINTMENT_')) {
          setAppointmentTick((t) => t + 1);
        }
      },
      onerror(err) {
        if (err instanceof FatalError) throw err; // stop retries
        // transient → return undefined → fetch-event-source retries w/ backoff
      },
    }).catch(() => {
      // Silent degrade: keep seeded data; live updates simply stop.
    });

    apiRequest<Notification[]>('/notifications', { token })
      .then((rows) => upsert(rows))
      .catch(() => {
        // Seed failed; the live stream may still populate. Never throw.
      });

    return () => ctrl.abort();
  }, [token]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH', token });
    } catch {
      apiRequest<Notification[]>('/notifications', { token })
        .then((rows) => setNotifications(rows))
        .catch(() => {});
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, appointmentTick }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Belt-and-suspenders: if the provider ever throws during render, render the
// app WITHOUT it. Consumers fall back to EMPTY context — never a white screen.
class NotificationErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function NotificationRoot({ children }: { children: React.ReactNode }) {
  return (
    <NotificationErrorBoundary fallback={children}>
      <NotificationProvider>{children}</NotificationProvider>
    </NotificationErrorBoundary>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/providers/notification-provider.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/providers/notification-provider.tsx frontend/src/providers/notification-provider.test.tsx
git commit -m "feat(notifications): NotificationProvider with live SSE, toast, silent degrade"
```

---

## Task 5: Frontend — mount provider in DashboardLayout, trim sidebar hook

**Files:**
- Modify: `frontend/src/components/layout/dashboard-layout.tsx`
- Modify: `frontend/src/hooks/use-patient-sidebar-data.ts`

- [ ] **Step 1: Trim `usePatientSidebarData`**

In `use-patient-sidebar-data.ts`:

Remove the `Notification` import — change:
```ts
import type { Appointment, Notification } from '@/types/api';
```
to:
```ts
import type { Appointment } from '@/types/api';
```

Remove the unread state — delete this line:
```ts
  const [unreadCount, setUnreadCount] = useState(0);
```

Replace the patient `Promise.all` block (the one fetching profile + appointments + notifications) with:
```ts
    Promise.all([
      apiRequest<PatientProfile>('/patients/profile', { token }),
      apiRequest<Appointment[]>('/appointments/patient', { token }),
    ]).then(([profile, appointments]) => {
      setPatientName(profile.fullName ?? session?.user?.name ?? session?.user?.email?.split('@')?.[0] ?? 'Patient');
      setAvatarUrl(profile.profilePictureUrl ?? null);
      setProfileCompletion(computeProfileCompletion(profile));
      setUpcomingCount(appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length);
    }).catch(() => {
      setPatientName(session?.user?.name ?? session?.user?.email?.split('@')?.[0] ?? 'Patient');
    });
```

Change the return — from:
```ts
  return { patientName, avatarUrl, profileCompletion, upcomingCount, unreadCount };
```
to:
```ts
  return { patientName, avatarUrl, profileCompletion, upcomingCount };
```

- [ ] **Step 2: Mount provider + Toaster + read unread from context in `dashboard-layout.tsx`**

Add imports at the top (after existing imports):
```ts
import { Toaster } from 'sonner';
import { NotificationRoot, useNotifications } from '@/providers/notification-provider';
```

Replace the `export function DashboardLayout(...)` definition with a thin wrapper plus an inner component. Replace:
```ts
export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navItems = role === 'patient' ? patientNav : doctorNav;
  const mobileNavItems = role === 'patient' ? patientMobileNav : navItems.slice(0, 5);

  const { patientName, avatarUrl, profileCompletion, upcomingCount, unreadCount } =
    usePatientSidebarData(role);
```
with:
```ts
export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  return (
    <NotificationRoot>
      <DashboardLayoutInner role={role}>{children}</DashboardLayoutInner>
      <Toaster richColors position="top-right" />
    </NotificationRoot>
  );
}

function DashboardLayoutInner({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navItems = role === 'patient' ? patientNav : doctorNav;
  const mobileNavItems = role === 'patient' ? patientMobileNav : navItems.slice(0, 5);

  const { patientName, avatarUrl, profileCompletion, upcomingCount } =
    usePatientSidebarData(role);
  const { unreadCount } = useNotifications();
```
(The rest of the original function body — `getPatientBadge` through the closing `}` — stays unchanged and now belongs to `DashboardLayoutInner`.)

- [ ] **Step 3: Verify types + existing tests**

Run: `cd frontend && npx tsc --noEmit && npx vitest run`
Expected: no TS errors; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/dashboard-layout.tsx frontend/src/hooks/use-patient-sidebar-data.ts
git commit -m "feat(notifications): wire live unread badge + toaster into dashboard layout"
```

---

## Task 6: Frontend — notification pages consume context

**Files:**
- Modify: `frontend/src/app/notifications/page.tsx`
- Modify: `frontend/src/app/doctor/notifications/page.tsx`

The pages render inside `<DashboardLayout>`, so they sit inside `NotificationRoot` and can read live data from context. Remove each page's own fetch/state and the now-unused loading/error branches.

- [ ] **Step 1: Refactor `app/notifications/page.tsx` data wiring**

Remove these imports (no longer used):
```ts
import { apiRequest } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";
import type { Notification } from "@/types/api";
```
Add:
```ts
import { useNotifications } from "@/providers/notification-provider";
```

Replace the state + fetch + handlers (the block from `const [notifications, setNotifications] = useState...` down through the end of `markAllAsRead`) with:
```ts
  const { notifications, markAsRead } = useNotifications();

  async function markAllAsRead() {
    const unread = notifications.filter(n => !n.readAt);
    if (unread.length === 0) return;
    await Promise.all(unread.map(n => markAsRead(n.id)));
  }
```
(Now-unused: `useEffect`, `useState`, `useSession`'s `token` for fetching, `error`, `loading`. Keep `useSession`/`token` only if still referenced; otherwise remove the unused imports `React, { useEffect, useState }` → `React` and drop `useSession` if unused. `router` stays.)

Replace the content render branch that begins `{loading ? (` ... and ends at its matching close, with the loading/error arms removed — keep only the empty-state and list:
```tsx
        {notifications.length === 0 ? (
```
…through the existing list JSX unchanged (delete the `loading ? (<Spinner/>) :` and `error ? (...) :` prefixes only).

- [ ] **Step 2: Apply the identical refactor to `app/doctor/notifications/page.tsx`**

Same edits: import `useNotifications`, replace local fetch/state with `const { notifications, markAsRead } = useNotifications();` plus the `markAllAsRead` helper above, and strip the `loading`/`error` render arms. Keep the doctor page's existing role-specific JSX (`notificationHref(notif.type, "doctor")`) unchanged.

- [ ] **Step 3: Verify build + tests**

Run: `cd frontend && npx tsc --noEmit && npx vitest run && npx next build`
Expected: no TS/lint errors; tests pass; production build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/notifications/page.tsx frontend/src/app/doctor/notifications/page.tsx
git commit -m "feat(notifications): notification pages read live context instead of one-shot fetch"
```

---

## Task 7: Frontend — appointment lists live-refresh (bonus)

**Files:**
- Modify: `frontend/src/app/appointments/page.tsx`
- Modify: `frontend/src/app/doctor/appointments/page.tsx`

The provider bumps `appointmentTick` on every `APPOINTMENT_*` event. Appointment list pages refetch when it changes. Keep minimal — wire only if each page already has a `fetch`/`load` function and a `useEffect`.

- [ ] **Step 1: Wire the tick into `app/appointments/page.tsx`**

Add import:
```ts
import { useNotifications } from "@/providers/notification-provider";
```
Inside the component, read the tick:
```ts
  const { appointmentTick } = useNotifications();
```
Add `appointmentTick` to the dependency array of the `useEffect` that loads appointments (so a new appointment event re-runs the existing fetch). Example: change `}, [token]);` on that effect to `}, [token, appointmentTick]);`.

- [ ] **Step 2: Apply the same wiring to `app/doctor/appointments/page.tsx`**

Same two additions: import `useNotifications`, read `appointmentTick`, append it to the appointment-loading `useEffect` dependency array.

- [ ] **Step 3: Verify build + tests**

Run: `cd frontend && npx tsc --noEmit && npx vitest run`
Expected: no errors; tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/appointments/page.tsx frontend/src/app/doctor/appointments/page.tsx
git commit -m "feat(notifications): refresh appointment lists on live APPOINTMENT_* events"
```

---

## Task 8: Acceptance gate (manual — do NOT deploy until both pass)

This gate is from the spec. Run it against a local build first, then the live Railway URL. Do not merge or deploy until both checks pass.

- [ ] **Step 1: Never-crash check (silent degrade)**

1. Run backend + frontend locally (`cd backend && npm run start:dev`, `cd frontend && npm run dev`).
2. Log in as a patient. Confirm the dashboard renders and seeded notifications show.
3. Kill the backend SSE path: stop the backend process (or block `/notifications/stream` via devtools network throttling/offline).
4. Reload the dashboard. **Expected:** dashboard still renders, sidebar/badge still show seeded data, no white screen, no thrown error overlay. Live updates simply stop.

- [ ] **Step 2: Live end-to-end on Railway**

1. Deploy the branch to a Railway preview (or after merge, before promoting).
2. Open the deployed URL, log in as a patient in one tab.
3. In a second tab/session, log in as the doctor (or trigger a booking via the patient).
4. Book an appointment. **Expected:** within ~1s the recipient tab shows a toast, the unread badge increments, and the notification appears in the list without reload.
5. Click through every other page (home, appointments, records, profile, doctor dashboard). **Expected:** all load normally.

- [ ] **Step 3: Record the result**

Only after both pass, proceed to merge per `superpowers:finishing-a-development-branch`.

---

## Self-Review Notes

- **Spec coverage:** SSE endpoint (Task 2), Subject emit at chokepoint (Task 1), connect-first + dedup (Task 4), silent degrade + error boundary (Task 4), explicit onerror 401-stop (Task 4), single-instance comment (Task 1), JWT-mid-stream comment (Task 2), toast/badge/list consumers (Tasks 5–6), appointment-list bonus (Task 7), acceptance gate (Task 8). All spec sections mapped.
- **Type consistency:** `streamForUser` / `stream$` / `MessageEvent` consistent across Tasks 1–2; `useNotifications` / `NotificationRoot` / `appointmentTick` / `markAsRead` consistent across Tasks 4–7.
- **No placeholders:** every code step shows full code; manual gate steps are concrete observations.
