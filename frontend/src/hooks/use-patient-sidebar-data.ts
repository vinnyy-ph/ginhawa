import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiRequest } from '@/lib/api-client';
import type { PatientProfile } from '@/types/patient-profile';
import type { Appointment, Notification } from '@/types/api';
import { computeProfileCompletion } from '@/components/layout/dashboard-nav';

type DoctorSidebarProfile = { fullName?: string | null; profilePictureUrl?: string | null };

/**
 * Loads the sidebar identity + badge counts. Patients get full profile +
 * badges; doctors get name + avatar only (badges stay zeroed).
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
    if (!token) return;

    if (role === 'doctor') {
      apiRequest<DoctorSidebarProfile>('/doctors/profile', { token })
        .then((profile) => {
          setPatientName(profile.fullName ?? session?.user?.name ?? session?.user?.email?.split('@')?.[0] ?? 'Doctor');
          setAvatarUrl(profile.profilePictureUrl ?? null);
        })
        .catch(() => {
          setPatientName(session?.user?.name ?? session?.user?.email?.split('@')?.[0] ?? 'Doctor');
        });
      return;
    }

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
