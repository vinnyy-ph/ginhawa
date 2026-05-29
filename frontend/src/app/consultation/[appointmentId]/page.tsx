"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DailyIframe, {
  DailyCall,
  DailyEventObjectAppMessage,
} from "@daily-co/daily-js";
import { apiRequest } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";

interface PatientContext {
  fullName: string;
  medicalHistory: string | null;
  weight: number | null;
  height: number | null;
  birthdate: string;
}

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
      // Doctor dropped — could be a transient network blip. Show reconnecting
      // UI instead of ejecting; only an explicit 'call-ended' leaves the call.
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
    }, 1500);
    return () => clearTimeout(timer);
  }, [notes, token, appointmentId, isDoctor]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <Spinner size="lg" />
      </div>
    );

  if (error || !roomUrl)
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <p className="text-error">{error ?? "Room not available."}</p>
      </div>
    );

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Video */}
      <div className={isDoctor ? "flex-1 relative" : "w-full relative"}>
        <div ref={containerRef} className="w-full h-full" />
        {!isDoctor && doctorDisconnected && (
          <div className="absolute inset-x-0 top-0 z-20 flex justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto bg-surface-white/95 shadow-lifted rounded-xl px-5 py-4 max-w-sm text-center space-y-3">
              <p className="text-sm font-semibold text-text-primary">
                Doctor disconnected — reconnecting…
              </p>
              {showReturn && (
                <button
                  onClick={() => router.push('/appointments')}
                  className="text-sm font-medium text-white bg-[#31a795] hover:bg-[#006b5e] rounded-md px-4 py-2 transition-colors"
                >
                  Return to appointments
                </button>
              )}
            </div>
          </div>
        )}
        {deviceError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0a0a0a]/80 p-4">
            <div className="bg-surface-white rounded-xl shadow-lifted px-6 py-5 max-w-sm text-center space-y-3">
              <p className="text-sm font-semibold text-text-primary">Camera / microphone unavailable</p>
              <p className="text-sm text-on-surface-variant">{deviceError}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm font-medium text-white bg-[#31a795] hover:bg-[#006b5e] rounded-md px-4 py-2 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Doctor Sidebar */}
      {isDoctor && (
        <div className="w-80 bg-surface-white flex flex-col border-l border-outline-variant/30">
          {/* Tab headers */}
          <div className="flex border-b border-outline-variant/30">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'notes' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Live Notes
              {isSaving && <span className="ml-1 text-xs text-on-surface-variant">(saving...)</span>}
            </button>
            <button
              onClick={() => setActiveTab('patient')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'patient' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Patient
            </button>
          </div>

          {/* Notes tab */}
          {activeTab === 'notes' && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document findings, symptoms, observations..."
              className="flex-1 resize-none p-4 text-sm text-on-surface bg-surface-white focus:outline-none"
            />
          )}

          {/* Patient context tab */}
          {activeTab === 'patient' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              {patientContext ? (
                <>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Patient</p>
                    <p className="text-on-surface font-medium">{patientContext.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Age</p>
                    <p className="text-on-surface">
                      {Math.floor((new Date().getTime() - new Date(patientContext.birthdate).getTime()) / (365.25 * 24 * 3600 * 1000))} years
                    </p>
                  </div>
                  {patientContext.weight && (
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Weight</p>
                      <p className="text-on-surface">{patientContext.weight} kg</p>
                    </div>
                  )}
                  {patientContext.height && (
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Height</p>
                      <p className="text-on-surface">{patientContext.height} cm</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Medical History</p>
                    <p className="text-on-surface-variant whitespace-pre-line leading-relaxed">
                      {patientContext.medicalHistory ?? 'None recorded'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-on-surface-variant text-center py-8">No patient data available.</p>
              )}
            </div>
          )}

          <div className="p-4 border-t border-outline-variant/30 space-y-3">
            <p className="text-xs text-on-surface-variant">
              Notes auto-save every 1.5s. They will be used for AI summarization after the call.
            </p>
            <button
              onClick={handleEndAndFinalize}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-[#31a795] hover:bg-[#006b5e] rounded-md transition-colors"
            >
              End &amp; Finalize →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
