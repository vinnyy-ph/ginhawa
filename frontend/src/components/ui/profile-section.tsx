'use client';

import * as React from 'react';

/** Titled section block for the dashboard profile forms. */
export function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-manrope">
        {title}
      </h2>
      {children}
    </section>
  );
}
