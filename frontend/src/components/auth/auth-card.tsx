// frontend/src/components/auth/auth-card.tsx
import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ title, subtitle, children, className }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div
        className={cn(
          'w-full max-w-md rounded-xl bg-surface-white shadow-lifted',
          'px-8 py-10',
          className,
        )}
      >
        <div className="mb-8 flex flex-col items-center gap-2">
          <Image src="/logo.svg" alt="Ginhawa" width={40} height={40} />
          <span className="text-sm font-semibold text-primary font-plus-jakarta tracking-wide">
            Ginhawa
          </span>
        </div>

        <h1 className="mb-1 text-2xl font-semibold text-text-primary font-plus-jakarta leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mb-6 text-sm text-on-surface-variant font-manrope">{subtitle}</p>
        )}
        <div className={subtitle ? '' : 'mt-6'}>{children}</div>
      </div>
    </div>
  );
}
