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

  const upsert = (incoming: Notification[]) =>
    setNotifications((prev) => {
      const seen = new Set(incoming.map((n) => n.id));
      return [...incoming, ...prev.filter((n) => !seen.has(n.id))];
    });

  useEffect(() => {
    if (!token) return;
    const ctrl = new AbortController();

    fetchEventSource(`${BASE_URL}/notifications/stream`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
      openWhenHidden: true,
      async onopen(res) {
        if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
          return;
        }
        if (res.status === 401 || res.status === 403) {
          throw new FatalError();
        }
        throw new Error('retriable');
      },
      onmessage(ev) {
        if (ev.event !== 'notification') return;
        const notif = JSON.parse(ev.data) as Notification;
        upsert([notif]);
        toast(notif.title, { description: notif.message });
        if (notif.type.startsWith('APPOINTMENT_')) {
          setAppointmentTick((t) => t + 1);
        }
      },
      onerror(err) {
        if (err instanceof FatalError) throw err;
      },
    }).catch(() => {});

    apiRequest<Notification[]>('/notifications', { token })
      .then((rows) => upsert(rows))
      .catch(() => {});

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
