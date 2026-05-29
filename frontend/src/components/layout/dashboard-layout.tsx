'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  HomeIcon,
  CalendarIcon,
  BellIcon,
  PersonIcon,
  ExitIcon,
  ClockIcon,
} from '@radix-ui/react-icons';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'patient' | 'doctor';
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navItems = doctorNav;

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-white border-r border-outline-variant shrink-0 fixed h-full z-20">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-outline-variant">
          <Logo size={28} className="h-7 w-auto" />
          <span className="text-lg font-bold tracking-tight text-text-primary font-serif">
            Ginhawa
          </span>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-outline-variant">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5">
            <PersonIcon className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              {role === 'patient' ? 'Patient' : 'Doctor'} Portal
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard' || item.href === '/doctor/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href);
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
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-outline-variant">
          {session?.user?.email && (
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#48cab6] to-[#31a795] flex items-center justify-center text-white text-xs font-bold shrink-0">
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
          {navItems.slice(0, 5).map((item) => {
            const isActive =
              item.href === '/dashboard' || item.href === '/doctor/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-w-0',
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                <span className="truncate max-w-[60px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0 min-h-screen">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
