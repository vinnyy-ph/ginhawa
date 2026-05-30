import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { NavItem } from './dashboard-nav';

interface MobileBottomNavProps {
  role: 'patient' | 'doctor';
  pathname: string;
  navItems: NavItem[];
  getBadge: (href: string) => number;
}

export function MobileBottomNav({ role, pathname, navItems, getBadge }: MobileBottomNavProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-white border-t border-outline-variant"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
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
  );
}
