import {
  HomeIcon,
  CalendarIcon,
  BellIcon,
  PersonIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChatBubbleIcon,
  FileTextIcon,
  AvatarIcon,
} from '@radix-ui/react-icons';
import type { PatientProfile } from '@/types/patient-profile';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export const doctorNav: NavItem[] = [
  { href: '/doctor/dashboard', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/doctor/profile', label: 'My Profile', icon: <PersonIcon className="w-4 h-4" /> },
  { href: '/doctor/appointments', label: 'Appointments', icon: <CalendarIcon className="w-4 h-4" /> },
  { href: '/doctor/patients', label: 'Patients', icon: <PersonIcon className="w-4 h-4" /> },
  { href: '/doctor/schedule', label: 'My Schedule', icon: <ClockIcon className="w-4 h-4" /> },
  { href: '/doctor/notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" /> },
];

export const patientNav: NavItem[] = [
  { href: '/', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/doctors', label: 'Find a Doctor', icon: <MagnifyingGlassIcon className="w-4 h-4" /> },
  { href: '/my-doctors', label: 'My Doctors', icon: <AvatarIcon className="w-4 h-4" /> },
  { href: '/recommendations', label: 'AI Checker', icon: <ChatBubbleIcon className="w-4 h-4" /> },
  { href: '/appointments', label: 'Appointments', icon: <CalendarIcon className="w-4 h-4" /> },
  { href: '/records', label: 'Records', icon: <FileTextIcon className="w-4 h-4" /> },
  { href: '/notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" /> },
  { href: '/profile', label: 'Profile', icon: <PersonIcon className="w-4 h-4" /> },
];

// Separate 5-item set for mobile bottom nav (excludes AI Checker and Notifications)
export const patientMobileNav: NavItem[] = [
  { href: '/', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/appointments', label: 'Appointments', icon: <CalendarIcon className="w-4 h-4" /> },
  { href: '/doctors', label: 'Doctors', icon: <MagnifyingGlassIcon className="w-4 h-4" /> },
  { href: '/records', label: 'Records', icon: <FileTextIcon className="w-4 h-4" /> },
  { href: '/profile', label: 'Profile', icon: <PersonIcon className="w-4 h-4" /> },
];

export function computeProfileCompletion(profile: PatientProfile): number {
  const fields = [
    profile.fullName,
    profile.birthdate,
    profile.contactDetails,
    profile.profilePictureUrl,
    profile.address,
    profile.city,
    profile.region,
  ];
  const filled = fields.filter(v => v !== null && v !== undefined && v !== '').length;
  return Math.round((filled / fields.length) * 100);
}
