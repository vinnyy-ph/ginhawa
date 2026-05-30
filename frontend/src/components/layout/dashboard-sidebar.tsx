import Link from 'next/link';
import { ExitIcon, PersonIcon } from '@radix-ui/react-icons';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { NavItem } from './dashboard-nav';

interface DashboardSidebarProps {
  role: 'patient' | 'doctor';
  pathname: string;
  navItems: NavItem[];
  getBadge: (href: string) => number;
  patientName: string;
  avatarUrl: string | null;
  profileCompletion: number;
  userName?: string | null;
  userEmail?: string | null;
  onLogout: () => void;
}

export function DashboardSidebar({
  role,
  pathname,
  navItems,
  getBadge,
  patientName,
  avatarUrl,
  profileCompletion,
  userName,
  userEmail,
  onLogout,
}: DashboardSidebarProps) {
  return (
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
          const badge = role === 'patient' ? getBadge(item.href) : 0;
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
        {role === 'doctor' && userEmail && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-light to-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(userName || userEmail).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-on-surface truncate">{userName || userEmail}</p>
              <p className="text-xs text-on-surface-variant capitalize">{role}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="w-full justify-start gap-2 text-on-surface-variant hover:text-error hover:bg-error/5"
          id="dashboard-logout"
        >
          <ExitIcon className="w-4 h-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
