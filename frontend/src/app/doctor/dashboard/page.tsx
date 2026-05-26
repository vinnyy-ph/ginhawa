import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { apiRequest } from '@/lib/api-client';
import { DoctorDashboardClient } from './doctor-dashboard-client';

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
