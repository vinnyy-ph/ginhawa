'use client';

/**
 * DashboardLayout — top-level shell for all authenticated dashboard pages.
 *
 * Composes the fixed DashboardSidebar (desktop), MobileBottomNav + MobileTopHeader
 * (mobile), and a scrollable main content area. Reads session and notification
 * state to compute live badge counts shown on sidebar and mobile nav links.
 *
 * Used by both patient pages (role="patient") and doctor pages (role="doctor");
 * the role prop switches which nav items are rendered.
 */

import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { doctorNav, patientNav, patientMobileNav } from './dashboard-nav';
import { usePatientSidebarData } from '@/hooks/use-patient-sidebar-data';
import { DashboardSidebar } from './dashboard-sidebar';
import { MobileBottomNav } from './mobile-bottom-nav';
import { MobileTopHeader } from './mobile-top-header';
import { useNotifications } from '@/providers/notification-provider';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'patient' | 'doctor';
}

/**
 * Renders the full dashboard shell: sidebar, mobile header, mobile bottom nav,
 * skip-navigation link for accessibility, and the page content slot.
 */
export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navItems = role === 'patient' ? patientNav : doctorNav;
  const mobileNavItems = role === 'patient' ? patientMobileNav : navItems.slice(0, 5);

  const { patientName, avatarUrl, profileCompletion, upcomingCount } =
    usePatientSidebarData(role);
  const { unreadCount } = useNotifications();

  // Maps nav hrefs to live badge counts: upcoming appointments and unread
  // notifications. Doctors have no badges — their getBadge always returns 0.
  const getPatientBadge = (href: string): number => {
    if (href === '/appointments') return upcomingCount;
    if (href === '/notifications') return unreadCount;
    return 0;
  };

  const homePath = role === 'patient' ? '/' : '/doctor/dashboard';
  const notificationsPath = role === 'patient' ? '/notifications' : '/doctor/notifications';
  const onLogout = () => signOut({ callbackUrl: '/login' });

  return (
    <div className="min-h-screen bg-surface flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded-md focus:bg-surface-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lifted"
      >
        Skip to content
      </a>

      <DashboardSidebar
        role={role}
        pathname={pathname}
        navItems={navItems}
        getBadge={getPatientBadge}
        patientName={patientName}
        avatarUrl={avatarUrl}
        profileCompletion={profileCompletion}
        userName={patientName || session?.user?.name}
        userEmail={session?.user?.email}
        onLogout={onLogout}
      />

      <MobileBottomNav
        role={role}
        pathname={pathname}
        navItems={mobileNavItems}
        getBadge={getPatientBadge}
      />

      {/* Main content */}
      <main id="main-content" className="flex-1 lg:ml-64 pb-20 lg:pb-0 min-h-screen">
        <MobileTopHeader
          homePath={homePath}
          notificationsPath={notificationsPath}
          pathname={pathname}
          onLogout={onLogout}
        />
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
