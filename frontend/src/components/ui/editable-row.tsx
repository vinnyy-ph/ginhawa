'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export const editInputClass =
  'w-full rounded-md border border-outline-variant bg-surface-white px-2.5 py-1.5 text-sm text-on-surface font-manrope placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

/**
 * One review row. Shows a value + EDIT; clicking EDIT swaps in an inline editor
 * (snapshot of the row's fields) with SAVE/CANCEL — no navigation away. SAVE
 * runs optional validate(); on error the row stays open and shows the message.
 */
export function EditableRow<T extends Record<string, unknown>>({
  label,
  display,
  initial,
  onSave,
  render,
  validate,
  fullWidth,
}: {
  label: string;
  display: string;
  initial: T;
  onSave: (draft: T) => void;
  render: (draft: T, set: <K extends keyof T>(k: K, v: T[K]) => void) => React.ReactNode;
  validate?: (draft: T) => string | null;
  fullWidth?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setDraft(initial);
    setError(null);
    setEditing(true);
  };
  const set = <K extends keyof T>(k: K, v: T[K]) => setDraft((p) => ({ ...p, [k]: v }) as T);
  const cancel = () => {
    setError(null);
    setEditing(false);
  };
  const save = () => {
    const err = validate?.(draft) ?? null;
    if (err) {
      setError(err);
      return;
    }
    onSave(draft);
    setError(null);
    setEditing(false);
  };

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'col-span-2')}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-bold text-outline font-plus-jakarta">{label}</span>
        {editing ? (
          <div className="flex items-center gap-3">
            <button type="button" onClick={save} className="text-[10px] font-bold text-primary hover:underline">SAVE</button>
            <button type="button" onClick={cancel} className="text-[10px] font-bold text-outline hover:underline">CANCEL</button>
          </div>
        ) : (
          <button type="button" onClick={start} className="text-[10px] font-bold text-primary hover:underline">EDIT</button>
        )}
      </div>
      {editing ? (
        <div className="mt-1 flex flex-col gap-1">
          {render(draft, set)}
          {error && <span role="alert" className="text-[11px] font-medium text-error font-manrope">{error}</span>}
        </div>
      ) : (
        <span className="text-sm font-medium text-on-surface font-manrope">{display || '—'}</span>
      )}
    </div>
  );
}
