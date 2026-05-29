"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DailyIframe, {
  DailyCall,
  DailyEventObjectAppMessage,
  DailyEventObjectParticipantLeft,
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

    callFrame.join({ url: roomUrl, userName: userName ?? undefined });
    callFrame.on('joined-meeting', () => { hasJoinedRef.current = true; });

    const handleAppMessage = (event: DailyEventObjectAppMessage) => {
      if (event.data?.type === 'call-ended') {
        router.push('/appointments');
      }
    };
    const handleParticipantLeft = (_event: DailyEventObjectParticipantLeft) => {
      // In a 1:1 consult, the only other participant is the doctor.
      router.push('/appointments');
    };
    if (!isDoctor) {
      callFrame.on('app-message', handleAppMessage);
      callFrame.on('participant-left', handleParticipantLeft);
    }

    return () => {
      if (!isDoctor) {
        callFrame.off('app-message', handleAppMessage);
        callFrame.off('participant-left', handleParticipantLeft);
      }
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
      <div className={isDoctor ? "flex-1" : "w-full"}>
        <div ref={containerRef} className="w-full h-full" />
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
