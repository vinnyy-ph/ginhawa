'use client';

/**
 * Generic controller hook for "view → edit → save / discard" flows on a
 * single authenticated resource. All profile-form hooks in this app
 * (`useDoctorProfileForm`, `usePatientProfileForm`) delegate to this hook
 * rather than duplicating load/save/snapshot logic. The caller supplies
 * type-safe `load` and `save` functions; validation lives in `save` and
 * surfaces as a thrown `Error` whose message is forwarded to the UI.
 *
 * Client-only: reads the session access token via `useSession`, so the
 * component tree must be wrapped in NextAuth's SessionProvider.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';

interface EditableResourceConfig<F> {
  emptyValues: F;
  /** Fetch the resource and map it into form values. */
  load: (token: string) => Promise<F>;
  /** Persist the form values. Throw an Error to surface its message to the user. */
  save: (values: F, token: string) => Promise<void>;
  loadErrorMessage?: string;
}

/**
 * Generic "view + edit a single resource" form controller. Owns the load,
 * edit/discard snapshot, save, and loading/saving/error/success state so a
 * page only wires `values` + `setField` into presentational cards. Validation
 * lives in the caller's `save`, which throws an Error whose message is shown.
 *
 * Edit lifecycle: `beginEdit` captures a snapshot of current values;
 * `discard` restores it. On successful `submit`, the snapshot is cleared and
 * a 3-second success flag is raised. The `load`/`loadErrorMessage` references
 * are intentionally omitted from the effect dependency array — they are
 * expected to be stable (module-level functions); the effect re-runs only when
 * the session access token changes.
 *
 * @template F - The form values type; keys map directly to `setField` calls.
 */
export function useEditableResource<F>({
  emptyValues,
  load,
  save,
  loadErrorMessage = 'Failed to load.',
}: EditableResourceConfig<F>) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [values, setValues] = useState<F>(emptyValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<F | null>(null);

  const setField = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (!token) return;
    load(token)
      .then(setValues)
      .catch(() => setError(loadErrorMessage))
      .finally(() => setLoading(false));
    // load/loadErrorMessage are caller-stable by intent; refetch only on token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function beginEdit() {
    setSnapshot(values);
    setIsEditing(true);
    setError(null);
  }

  function discard() {
    if (snapshot) setValues(snapshot);
    setIsEditing(false);
    setError(null);
    setSnapshot(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || !isEditing) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await save(values, token);
      setSuccess(true);
      setIsEditing(false);
      setSnapshot(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return { values, setField, isEditing, loading, saving, error, success, beginEdit, discard, submit };
}
