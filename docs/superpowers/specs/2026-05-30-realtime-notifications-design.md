# Real-time Push Notifications (SSE) — Design

**Date:** 2026-05-30
**Status:** Approved, pre-implementation
**Branch:** `feature/realtime-notifications`

## Problem

Notification rows are created in the DB (data model + triggers exist) but never pushed
to the client. Today `usePatientSidebarData` fetches `/notifications` **once on mount**,
so the unread badge and notification list go stale until a full page reload. There is no
active poll to replace — this work adds freshness that does not exist today.

Goal: when a `Notification` row is created, the recipient sees it live — toast + unread
badge + notification list — without reloading.

## Scope

In:
- Backend SSE endpoint `GET /notifications/stream` (`text/event-stream`).
- Live delivery to: toast, unread badge, notification list pages.
- Appointment-list live refresh on `APPOINTMENT_*` events (small bonus).

Out (YAGNI — do not build):
- Multi-instance message bus (Redis / Postgres `LISTEN/NOTIFY`).
- Cross-tab read-state sync.
- Notification preferences / muting.
- Notification sound.

## Chokepoint Verification (done)

Confirmed every notification write flows through `NotificationsService.createNotification`:
- `grep notification.create` → only hit is line 37 inside `createNotification` itself.
- Callers: `appointments.service.ts:56`, `medical-records.service.ts:99` — both via the service.
- No direct `prisma.notification.create`, no `createMany`, no raw SQL inserts.

→ A single `stream$.next()` in `createNotification` emits for 100% of notification births.

## Architecture

```
createNotification() ──.next(notif)──▶ stream$ (RxJS Subject, in NotificationsService)
                                              │
        @Sse('stream') ◀─────────────────────┘  streamForUser(userId):
        @UseGuards(JwtAuthGuard)                  merge(
                                                    heartbeat$ (30s ping),
                                                    stream$.filter(n.userId === userId).map(toMessageEvent)
                                                  )
                                              │
                                              ▼  text/event-stream
        ┌──────────────── frontend NotificationProvider (DashboardLayout) ────────────────┐
        │  ONE fetchEventSource connection (Bearer header)                                 │
        │  ├─ connect first, THEN seed via GET /notifications, dedup by id                 │
        │  ├─ on 'notification' event → prepend, bump unreadCount, toast()                 │
        │  ├─ silent-degrade: SSE error/never-opens → keep seeded data, live updates stop  │
        │  ├─ wrapped in error boundary (must never white-screen the dashboard)            │
        │  └─ exposes { notifications, unreadCount, markAsRead, appointmentTick }          │
        └─────────────────────────────────────────────────────────────────────────────────┘
```

**Single-instance only.** The in-memory `Subject` reaches every connected client because
all connections live in one backend process (Railway = 1 container). If ever scaled to
multiple replicas, swap the `Subject` for a Postgres `LISTEN/NOTIFY` or Redis pub/sub
bridge so all instances hear every event. Leave this as a code comment at the `Subject`.

## Backend

No new dependencies (RxJS ships with NestJS).

**`NotificationsService`**
- Add `private readonly stream$ = new Subject<Notification>()`.
  - Code comment: single-instance only; swap for LISTEN/NOTIFY or Redis if replicated.
- `createNotification()`: after `prisma.notification.create`, call `this.stream$.next(notification)`.
- Add `streamForUser(userId: string): Observable<MessageEvent>`:
  ```
  merge(
    interval(30000).pipe(map(() => ({ type: 'ping', data: '' }))),
    this.stream$.pipe(
      filter((n) => n.userId === userId),
      map((n) => ({ type: 'notification', data: JSON.stringify(n) })),
    ),
  )
  ```

**`NotificationsController`**
- Add:
  ```
  @Sse('stream')
  @UseGuards(JwtAuthGuard)
  stream(@Request() req: { user: { id: string } }) {
    return this.service.streamForUser(req.user.id);
  }
  ```
- Guard unchanged (header-based). Note: `JwtAuthGuard` runs only at connect time —
  a long-lived connection outlives its JWT. **Accepted for MVP.** Leave a one-line
  code comment; no token-refresh handling.

**`NotificationsModule`** — no change.

## Frontend

New deps: `sonner`, `@microsoft/fetch-event-source`.

**`NotificationProvider`** (new React context; mounted in `DashboardLayout`, the render
path of every authenticated page)
- **Must never crash the dashboard** (non-negotiable). Mounting in `DashboardLayout`
  means a throw white-screens the whole app. Requirements:
  1. Wrap the provider subtree in an error boundary.
  2. Silent-degrade: if the SSE connection errors or never opens, fall back to the
     seeded `GET /notifications` data and keep working — live updates simply stop.
- **Connect first, then seed.** Open `fetchEventSource` first, then `GET /notifications`
  to seed; dedup by `id` on merge. This closes the gap where an event fired between
  seed and connect would otherwise be lost.
- `fetchEventSource('/notifications/stream', { headers: { Authorization: \`Bearer ${token}\` } })`.
  ONE connection per session, not one per component. Abort on unmount / token change.
- **`onerror` is explicit** (not implicit): in `@microsoft/fetch-event-source`, throwing
  in `onerror` stops retries; returning (a number/undefined) retries. Policy:
  - `401` / expired token → **throw** (stop-and-refresh; do not hammer the endpoint).
  - other/transient errors → **return** to allow backoff retry.
- On `notification` event → prepend to list, increment `unreadCount`, `toast(title, { description: message })`.
- Ignore `ping` events (heartbeat).
- Exposes `{ notifications, unreadCount, markAsRead, appointmentTick }`.

**`<Toaster />`** (sonner) mounted once in `DashboardLayout`.

**Refactor 3 existing consumers** to read context (delete their own notification fetches):
- `usePatientSidebarData` — drop the `/notifications` fetch + `unreadCount`; read from
  context. Keep profile + appointments fetches.
- `app/notifications/page.tsx` — consume context list + `markAsRead`.
- `app/doctor/notifications/page.tsx` — same.

**Appointment-list live refresh (bonus):** on `APPOINTMENT_*` events the provider bumps
`appointmentTick`; appointment list pages refetch when it changes. Small; keep minimal.

## Error Handling Summary

| Case | Behavior |
|------|----------|
| SSE never opens / errors | Silent-degrade to seeded GET data; dashboard renders normally |
| Provider throws | Error boundary contains it; app does not white-screen |
| 401 / expired token | `onerror` throws → stop retries (stop-and-refresh) |
| Transient network error | `onerror` returns → retry with backoff |
| Event in seed/connect gap | Connect-first + id-dedup prevents loss |
| JWT expires mid-stream | Accepted for MVP; code comment only |
| Proxy idle timeout | 30s heartbeat ping keeps connection open |

## Tests

- Backend: `createNotification` pushes to `stream$`; `streamForUser` emits only the
  target user's notifications (subscribe-collect / filter by userId).
- Frontend: mock `fetchEventSource` → assert toast fires, state prepends, `id` dedup,
  and that an error path keeps seeded data (silent-degrade).

## Acceptance Gate (before merge / deploy)

Hard gate — do not deploy until both pass:
1. **Provider never crashes the dashboard:** kill/block the stream, confirm the dashboard
   still renders and seeded notifications still show.
2. **Live end-to-end on the Railway URL:** log in, book an appointment, see the toast
   fire, and confirm every other page still loads.
