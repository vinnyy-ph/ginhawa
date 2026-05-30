'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { NotificationRoot } from '@/providers/notification-provider';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationRoot>{children}</NotificationRoot>
      <Toaster richColors position="top-right" />
    </SessionProvider>
  );
}
