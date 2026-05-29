'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  MagnifyingGlassIcon,
  ChatBubbleIcon,
  CalendarIcon,
  FileTextIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';

const items = [
  { href: '/doctors', label: 'Doctors', Icon: MagnifyingGlassIcon },
  { href: '/recommendations', label: 'Check', Icon: ChatBubbleIcon },
  { href: '/appointments', label: 'Appointments', Icon: CalendarIcon },
  { href: '/records', label: 'Records', Icon: FileTextIcon },
  { href: '/profile', label: 'Profile', Icon: PersonIcon },
];

export function PatientMobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  if (!session?.user) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-white border-t border-outline-variant"
      aria-label="Patient navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-w-0',
                isActive ? 'text-primary' : 'text-on-surface-variant',
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[64px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
