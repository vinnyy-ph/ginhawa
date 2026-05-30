/**
 * video-overlays — floating UI panels layered over the video feed during a consultation.
 *
 * Provides two overlays:
 *   - DoctorDisconnectedOverlay: notifies the patient that the doctor dropped
 *     and offers a "Return to appointments" escape hatch after a timeout.
 *   - DeviceErrorOverlay: shown when the browser cannot access camera/mic,
 *     with a Retry action so the user can grant permissions without a reload.
 *
 * Both are positioned absolutely relative to the video container and rendered
 * conditionally by the consultation page (/consultation/[id]).
 */

/** Notification banner shown to the patient when the doctor's connection drops. */
export function DoctorDisconnectedOverlay({
  showReturn,
  onReturn,
}: {
  showReturn: boolean;
  onReturn: () => void;
}) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto bg-surface-white/95 shadow-lifted rounded-xl px-5 py-4 max-w-sm text-center space-y-3">
        <p className="text-sm font-semibold text-text-primary">
          Doctor disconnected — reconnecting…
        </p>
        {showReturn && (
          <button
            onClick={onReturn}
            className="text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-md px-4 py-2 transition-colors"
          >
            Return to appointments
          </button>
        )}
      </div>
    </div>
  );
}

/** Full-screen blocker rendered when camera or microphone access fails. */
export function DeviceErrorOverlay({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0a0a0a]/80 p-4">
      <div className="bg-surface-white rounded-xl shadow-lifted px-6 py-5 max-w-sm text-center space-y-3">
        <p className="text-sm font-semibold text-text-primary">Camera / microphone unavailable</p>
        <p className="text-sm text-on-surface-variant">{message}</p>
        <button
          onClick={onRetry}
          className="text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-md px-4 py-2 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
