// frontend/src/app/dashboard/dashboard-client.tsx
'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function DashboardClient() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Minimal nav bar with logout */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-outline-variant bg-surface-white">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Ginhawa" className="h-7 w-7" />
          <span className="text-sm font-semibold text-primary font-plus-jakarta tracking-wide">
            Ginhawa
          </span>
        </div>
        <Button
          id="dashboard-logout"
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Log out
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-3xl font-semibold text-text-primary font-plus-jakarta">
          Welcome to your dashboard
        </h1>
        <p className="text-on-surface-variant font-manrope">
          Your patient dashboard is coming soon. You&apos;re all set up!
        </p>
      </main>
    </div>
  );
}
