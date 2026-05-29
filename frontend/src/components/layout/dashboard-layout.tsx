'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  HomeIcon,
  CalendarIcon,
  BellIcon,
  PersonIcon,
  ExitIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChatBubbleIcon,
  FileTextIcon,
} from '@radix-ui/react-icons';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import type { PatientProfile } from '@/types/patient';
import type { Appointment, Notification } from '@/types/api';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const doctorNav: NavItem[] = [
  { href: '/doctor/dashboard', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/doctor/profile', label: 'My Profile', icon: <PersonIcon className="w-4 h-4" /> },
  { href: '/doctor/appointments', label: 'Appointments', icon: <CalendarIcon className="w-4 h-4" /> },
  { href: '/doctor/patients', label: 'Patients', icon: <PersonIcon className="w-4 h-4" /> },
  { href: '/doctor/schedule', label: 'My Schedule', icon: <ClockIcon className="w-4 h-4" /> },
  { href: '/doctor/notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" /> },
];

const patientNav: NavItem[] = [
  { href: '/', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/doctors', label: 'Find a Doctor', icon: <MagnifyingGlassIcon className="w-4 h-4" /> },
  { href: '/recommendations', label: 'AI Checker', icon: <ChatBubbleIcon className="w-4 h-4" /> },
  { href: '/appointments', label: 'Appointments', icon: <CalendarIcon className="w-4 h-4" /> },
  { href: '/records', label: 'Records', icon: <FileTextIcon className="w-4 h-4" /> },
  { href: '/notifications', label: 'Notifications', icon: <BellIcon className="w-4 h-4" /> },
  { href: '/profile', label: 'Profile', icon: <PersonIcon className="w-4 h-4" /> },
];

// Separate 5-item set for mobile bottom nav (excludes AI Checker and Notifications)
const patientMobileNav: NavItem[] = [
  { href: '/', label: 'Overview', icon: <HomeIcon className="w-4 h-4" /> },
  { href: '/appointments', label: 'Appointments', icon: <CalendarIcon className="w-4 h-4" /> },
  { href: '/doctors', label: 'Doctors', icon: <MagnifyingGlassIcon className="w-4 h-4" /> },
  { href: '/records', label: 'Records', icon: <FileTextIcon className="w-4 h-4" /> },
  { href: '/profile', label: 'Profile', icon: <PersonIcon className="w-4 h-4" /> },
];

function computeProfileCompletion(profile: PatientProfile): number {
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

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'patient' | 'doctor';
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navItems = role === 'patient' ? patientNav : doctorNav;
  const mobileNavItems = role === 'patient' ? patientMobileNav : navItems.slice(0, 5);

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
      setPatientName(profile.fullName ?? session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Patient');
      setAvatarUrl(profile.profilePictureUrl ?? null);
      setProfileCompletion(computeProfileCompletion(profile));
      setUpcomingCount(appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length);
      setUnreadCount(notifications.filter(n => !n.readAt).length);
    }).catch(() => {
      setPatientName(session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Patient');
    });
  }, [role, session?.user?.accessToken, session?.user?.name, session?.user?.email]);

  const getPatientBadge = (href: string): number => {
    if (href === '/appointments') return upcomingCount;
    if (href === '/notifications') return unreadCount;
    return 0;
  };

  const homePath = role === 'patient' ? '/' : '/doctor/dashboard';
  const notificationsPath = role === 'patient' ? '/notifications' : '/doctor/notifications';

  return (
    <div className="min-h-screen bg-surface flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded-md focus:bg-surface-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lifted"
      >
        Skip to content
      </a>

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-white border-r border-outline-variant shrink-0 fixed h-full z-20">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-outline-variant">
          <Logo size={28} className="h-7 w-auto" />
          <span className="text-lg font-bold tracking-tight text-text-primary font-serif">
            Ginhawa
          </span>
        </div>

        {/* Patient identity card */}
        {role === 'patient' && (
          <div className="mx-3 my-3 p-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-center gap-2.5 mb-2.5">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={patientName}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(patientName || 'P').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{patientName || '—'}</p>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Patient Portal</p>
              </div>
            </div>
            {profileCompletion < 100 && profileCompletion > 0 && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-on-surface-variant">Profile</span>
                  <span className="text-xs font-semibold text-primary">{profileCompletion}%</span>
                </div>
                <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Doctor role badge */}
        {role === 'doctor' && (
          <div className="px-4 py-3 border-b border-outline-variant">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5">
              <PersonIcon className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Doctor Portal
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === '/' || item.href === '/doctor/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const badge = role === 'patient' ? getPatientBadge(item.href) : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={cn(isActive ? 'text-primary' : 'text-on-surface-variant')}>
                  {item.icon}
                </span>
                {item.label}
                {badge > 0 ? (
                  <span className="ml-auto text-xs font-bold bg-primary text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {badge}
                  </span>
                ) : isActive ? (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-outline-variant">
          {role === 'doctor' && session?.user?.email && (
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(session.user.name || session.user.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate">{session.user.name || session.user.email}</p>
                <p className="text-xs text-on-surface-variant capitalize">{role}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full justify-start gap-2 text-on-surface-variant hover:text-error hover:bg-error/5"
            id="dashboard-logout"
          >
            <ExitIcon className="w-4 h-4" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-white border-t border-outline-variant"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {mobileNavItems.map((item) => {
            const isActive =
              item.href === '/' || item.href === '/doctor/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const badge = role === 'patient' ? getPatientBadge(item.href) : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-w-0 relative',
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                <span className="truncate max-w-[60px]">{item.label}</span>
                {badge > 0 && (
                  <span className="absolute top-0 right-0.5 text-xs font-bold bg-error text-white px-1 rounded-full min-w-[14px] text-center leading-none">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main id="main-content" className="flex-1 lg:ml-64 pb-20 lg:pb-0 min-h-screen">
        {/* Mobile top header */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between bg-surface-white border-b border-outline-variant px-4 py-3">
          <Link href={homePath} className="flex items-center gap-2">
            <Logo size={24} className="h-6 w-auto" />
            <span className="text-base font-bold tracking-tight text-text-primary font-serif">Ginhawa</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href={notificationsPath}
              aria-label="Notifications"
              className={cn(
                'p-2 rounded-full hover:bg-surface-container transition-colors',
                pathname === notificationsPath ? 'text-primary' : 'text-on-surface-variant',
              )}
            >
              <BellIcon className="w-5 h-5" />
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              aria-label="Log out"
              className="p-2 rounded-full text-on-surface-variant hover:bg-error/5 hover:text-error transition-colors"
            >
              <ExitIcon className="w-5 h-5" />
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
