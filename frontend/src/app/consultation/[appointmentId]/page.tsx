"use client";

/**
 * Route: /consultation/[appointmentId] — live video consultation room
 *
 * Embeds a Daily.co iframe for the active appointment. Renders differently
 * by role: doctors see a sidebar with notes (auto-saved via debounce) and
 * patient context; patients see full-screen video with overlay states.
 * Accessible to both DOCTOR and PATIENT roles — role is inferred from the
 * session at runtime.
 */

import { useEffect, useState, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DailyIframe, {
  DailyCall,
  DailyEventObjectAppMessage,
} from "@daily-co/daily-js";
import { apiRequest } from "@/lib/api-client";
import { ConsultationLoading, ConsultationError } from "@/components/consultation/consultation-states";
import { ConsultationDoctorSidebar } from "@/components/consultation/doctor-sidebar";
import { DoctorDisconnectedOverlay, DeviceErrorOverlay } from "@/components/consultation/video-overlays";
import type { PatientContext } from "@/components/consultation/patient-context-panel";

/**
 * Resolves the dynamic [appointmentId] segment, fetches the Daily room URL
 * and optional patient context from GET /consultation/:id/room, then mounts
 * the call frame. Handles camera/microphone permission errors and the
 * doctor-disconnected grace period (60 s before showing a "return" prompt).
 */
export default function ConsultationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const resolvedParams = use(params);
  const appointmentId = resolvedParams.appointmentId;
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const isDoctor = session?.user?.role === "DOCTOR";
  const router = useRouter();

  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [patientContext, setPatientContext] = useState<PatientContext | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'patient'>('notes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);
  const hasJoinedRef = useRef(false);

  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [doctorDisconnected, setDoctorDisconnected] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ roomUrl: string; userName: string; patientContext?: PatientContext }>(`/consultation/${appointmentId}/room`, { token })
      .then((data) => { setRoomUrl(data.roomUrl); setUserName(data.userName); if (data.patientContext) setPatientContext(data.patientContext); })
      .catch(() => setError("Could not load consultation room."))
      .finally(() => setLoading(false));
  }, [token, appointmentId]);

  useEffect(() => {
    if (!roomUrl || !containerRef.current || callFrameRef.current) return;

    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: { width: '100%', height: '100%', border: '0' },
      showLeaveButton: true,
      showFullscreenButton: true,
    });
    callFrameRef.current = callFrame;

    callFrame.join({ url: roomUrl, userName: userName ?? undefined }).catch(() => {
      setDeviceError(
        "We couldn't start your camera or microphone. Check that your browser has permission, then retry.",
      );
    });
    callFrame.on('joined-meeting', () => {
      hasJoinedRef.current = true;
      setDeviceError(null);
    });

    const handleDeviceError = () => {
      setDeviceError(
        "Camera or microphone access is blocked. Allow access from your browser's address bar, then click Retry.",
      );
    };
    callFrame.on('camera-error', handleDeviceError);

    const handleAppMessage = (event: DailyEventObjectAppMessage) => {
      if (event.data?.type === 'call-ended') {
        router.push('/appointments');
      }
    };
    const handleParticipantLeft = () => {
      // Doctor dropped — could be a transient network blip. Show a
      // "reconnecting" overlay instead of ejecting the patient immediately.
      // A 60-second timer then exposes a "Return to appointments" prompt.
      // Only an explicit 'call-ended' app-message actually navigates away.
      setDoctorDisconnected(true);
      setShowReturn(false);
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
      returnTimerRef.current = setTimeout(() => setShowReturn(true), 60_000);
    };
    const handleParticipantJoined = () => {
      setDoctorDisconnected(false);
      setShowReturn(false);
      if (returnTimerRef.current) {
        clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }
    };
    if (!isDoctor) {
      callFrame.on('app-message', handleAppMessage);
      callFrame.on('participant-left', handleParticipantLeft);
      callFrame.on('participant-joined', handleParticipantJoined);
    }

    return () => {
      if (!isDoctor) {
        callFrame.off('app-message', handleAppMessage);
        callFrame.off('participant-left', handleParticipantLeft);
        callFrame.off('participant-joined', handleParticipantJoined);
      }
      callFrame.off('camera-error', handleDeviceError);
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
      callFrame.destroy();
      callFrameRef.current = null;
      hasJoinedRef.current = false;
    };
  }, [roomUrl, userName, isDoctor, router]);

  async function handleEndAndFinalize() {
    if (callFrameRef.current && hasJoinedRef.current) {
      try {
        await callFrameRef.current.sendAppMessage({ type: 'call-ended' }, '*');
      } catch { /* non-fatal */ }
    }
    router.push(`/doctor/finalize/${appointmentId}`);
  }

  useEffect(() => {
    if (!token || !isDoctor || !notes) return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await apiRequest(`/consultation/${appointmentId}/notes`, {
          method: "PATCH",
          token,
          body: { notes },
        });
      } catch {
        /* non-fatal */
      } finally {
        setIsSaving(false);
      }
    }, 1500); // 1500 ms debounce — waits for the doctor to pause typing before persisting
    return () => clearTimeout(timer);
  }, [notes, token, appointmentId, isDoctor]);

  if (loading) return <ConsultationLoading />;
  if (error || !roomUrl) return <ConsultationError message={error} />;

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Video */}
      <div className={isDoctor ? "flex-1 relative" : "w-full relative"}>
        <div ref={containerRef} className="w-full h-full" />
        {!isDoctor && doctorDisconnected && (
          <DoctorDisconnectedOverlay
            showReturn={showReturn}
            onReturn={() => router.push('/appointments')}
          />
        )}
        {deviceError && (
          <DeviceErrorOverlay message={deviceError} onRetry={() => window.location.reload()} />
        )}
      </div>

      {/* Doctor Sidebar */}
      {isDoctor && (
        <ConsultationDoctorSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          notes={notes}
          onNotesChange={setNotes}
          isSaving={isSaving}
          patientContext={patientContext}
          onEndAndFinalize={handleEndAndFinalize}
        />
      )}
    </div>
  );
}
