/**
 * MobileTopHeader — sticky top app bar shown on mobile/tablet for authenticated users.
 *
 * Provides the Ginhawa logo (links to the role-appropriate home), a notifications
 * bell (active-tinted when on the notifications page), and a logout button.
 * Hidden on desktop (lg:hidden) where the sidebar renders instead. Used by
 * DashboardLayout.
 */
import Link from 'next/link';
import { BellIcon, ExitIcon } from '@radix-ui/react-icons';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

interface MobileTopHeaderProps {
  homePath: string;
  notificationsPath: string;
  pathname: string;
  onLogout: () => void;
}

/** Renders the mobile sticky header with brand link, notifications icon, and logout. */
export function MobileTopHeader({ homePath, notificationsPath, pathname, onLogout }: MobileTopHeaderProps) {
  return (
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
          onClick={onLogout}
          aria-label="Log out"
          className="p-2 rounded-full text-on-surface-variant hover:bg-error/5 hover:text-error transition-colors"
        >
          <ExitIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
