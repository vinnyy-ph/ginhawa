/**
 * consultation-states — full-screen placeholder components for the consultation page.
 *
 * Provides two lightweight components used while the video room is initializing
 * or when the room cannot be opened. Both fill the entire viewport to prevent
 * layout shift on the consultation page (/consultation/[id]).
 */
import { Spinner } from "@/components/ui/spinner";

/** Full-screen spinner displayed while appointment data or the video room loads. */
export function ConsultationLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <Spinner size="lg" />
    </div>
  );
}

/** Full-screen error message when the consultation room is unavailable. */
export function ConsultationError({ message }: { message?: string | null }) {
  return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <p className="text-error">{message ?? "Room not available."}</p>
    </div>
  );
}
