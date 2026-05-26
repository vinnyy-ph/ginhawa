// frontend/src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DashboardClient } from './dashboard-client';

export default async function PatientDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Fetch PatientProfile — if none exists, guide user back to onboarding
  const token = session?.user?.accessToken;
  let hasProfile = false;
  if (token) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/patients/profile`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
      );
      hasProfile = res.ok;
    } catch {
      // network error — let dashboard render, user can retry
    }
  }

  if (!hasProfile) {
    redirect('/onboarding/1');
  }

  return <DashboardClient />;
}
