'use client';

/**
 * Top-level client provider that composes the three cross-cutting concerns
 * every authenticated page needs: session management (NextAuth SessionProvider),
 * real-time notifications (NotificationRoot — SSE stream + error boundary),
 * and toast rendering (Sonner Toaster). Wrap the application layout with this
 * component once; inner pages consume session and notification data via their
 * respective hooks.
 */
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { NotificationRoot } from '@/providers/notification-provider';

/**
 * Composes NextAuth's SessionProvider, the notification SSE layer, and the
 * global Sonner toast container. Must be rendered on the client; all child
 * components gain access to `useSession`, `useNotifications`, and `toast`.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationRoot>{children}</NotificationRoot>
      <Toaster richColors position="top-right" />
    </SessionProvider>
  );
}
