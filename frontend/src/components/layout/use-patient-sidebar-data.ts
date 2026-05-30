import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiRequest } from '@/lib/api-client';
import type { PatientProfile } from '@/types/patient';
import type { Appointment, Notification } from '@/types/api';
import { computeProfileCompletion } from './dashboard-nav';

/**
 * Loads the patient's sidebar identity + badge counts. No-op for doctors
 * (returns zeroed defaults), so the dashboard layout can call it unconditionally.
 */
export function usePatientSidebarData(role: 'patient' | 'doctor') {
  const { data: session } = useSession();

  const [patientName, setPatientName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = session?.user?.accessToken;
    if (role !== 'patient' || !token) return;

    Promise.all([
      apiRequest<PatientProfile>('/patients/profile', { token }),
      apiRequest<Appointment[]>('/appointments/patient', { token }),
      apiRequest<Notification[]>('/notifications', { token }),
    ]).then(([profile, appointments, notifications]) => {
      setPatientName(profile.fullName ?? session?.user?.name ?? session?.user?.email?.split('@')?.[0] ?? 'Patient');
      setAvatarUrl(profile.profilePictureUrl ?? null);
      setProfileCompletion(computeProfileCompletion(profile));
      setUpcomingCount(appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length);
      setUnreadCount(notifications.filter(n => !n.readAt).length);
    }).catch(() => {
      setPatientName(session?.user?.name ?? session?.user?.email?.split('@')?.[0] ?? 'Patient');
    });
  }, [role, session?.user?.accessToken, session?.user?.name, session?.user?.email]);

  return { patientName, avatarUrl, profileCompletion, upcomingCount, unreadCount };
}
