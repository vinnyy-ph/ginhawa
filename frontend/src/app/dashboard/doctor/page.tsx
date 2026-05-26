'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';

export default function DoctorDashboard() {
  const [needsAvailability, setNeedsAvailability] = useState(true);

  // In a real implementation you would check actual availability slot count from backend
  // For now, we simulate the post-onboarding state.
  
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 border-b border-outline-variant bg-surface-white">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Ginhawa" className="h-7 w-7" />
          <span className="text-sm font-semibold text-primary font-plus-jakarta tracking-wide">
            Ginhawa - Doctor Portal
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

      <main className="p-8">
        <h1 className="text-3xl font-bold mb-6 font-plus-jakarta">Doctor Dashboard</h1>
        {needsAvailability && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
            <p className="font-bold">Set your availability</p>
            <p>You cannot be booked by patients until you add available time slots.</p>
            <button className="mt-2 bg-yellow-500 text-white px-4 py-2 rounded font-semibold shadow hover:bg-yellow-600 transition-colors">
              Set Up Now
            </button>
          </div>
        )}
        <p className="text-on-surface-variant font-manrope">
          Dashboard content...
        </p>
      </main>
    </div>
  );
}
