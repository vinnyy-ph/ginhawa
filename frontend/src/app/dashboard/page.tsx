// frontend/src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DashboardClient } from './dashboard-client';
import { apiRequest } from '@/lib/api-client';

export default async function PatientDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Fetch PatientProfile — if none exists, guide user back to onboarding
  const token = session?.user?.accessToken;
  let hasProfile = false;
  if (token) {
    try {
      await apiRequest('/patients/profile', { token });
      hasProfile = true;
    } catch {
      // network error or 404 — let dashboard render or redirect to onboarding
      hasProfile = false;
    }
  }

  if (!hasProfile) {
    redirect('/onboarding/1');
  }

  return <DashboardClient />;
}
