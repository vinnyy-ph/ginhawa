/**
 * Route: /doctor/dashboard — doctor home dashboard
 *
 * Server Component that performs two auth/onboarding checks before
 * rendering:
 *   1. Session guard — unauthenticated users are redirected to /login.
 *   2. Profile guard — doctors without a completed profile are redirected
 *      to /onboarding/doctor so they cannot access the dashboard
 *      with an incomplete account.
 *
 * Accessible to authenticated DOCTOR role only.
 * Actual dashboard UI is delegated to the client component DoctorDashboardClient.
 */
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { apiRequest } from '@/lib/api-client';
import { DoctorDashboardClient } from './doctor-dashboard-client';

/**
 * Server-side entry point. Validates session and doctor profile existence
 * before handing off to the interactive client component. Using a Server
 * Component here avoids a client-side redirect flash for unauthenticated
 * or un-onboarded doctors.
 */
export default async function DoctorDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const token = session?.user?.accessToken;
  let hasProfile = false;
  if (token) {
    try {
      await apiRequest('/doctors/profile', { token });
      hasProfile = true;
    } catch {
      hasProfile = false;
    }
  }

  if (!hasProfile) {
    redirect('/onboarding/doctor');
  }

  return <DoctorDashboardClient />;
}
