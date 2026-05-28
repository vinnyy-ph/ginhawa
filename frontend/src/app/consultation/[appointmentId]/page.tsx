"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DailyIframe, { DailyCall, DailyEventObjectAppMessage } from "@daily-co/daily-js";
import { apiRequest } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";

export default function ConsultationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const resolvedParams = use(params);
  const appointmentId = resolvedParams.appointmentId;
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const isDoctor = session?.user?.role === "DOCTOR";
  const router = useRouter();

  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ roomUrl: string; userName: string }>(`/consultation/${appointmentId}/room`, { token })
      .then((data) => { setRoomUrl(data.roomUrl); setUserName(data.userName); })
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
        router.push('/dashboard/records');
      }
    };
    if (!isDoctor) {
      callFrame.on('app-message', handleAppMessage);
    }

    return () => {
      if (!isDoctor) {
        callFrame.off('app-message', handleAppMessage);
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

      {/* Doctor Notes Sidebar */}
      {isDoctor && (
        <div className="w-80 bg-surface-white flex flex-col border-l border-outline-variant/30">
          <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
            <h2 className="font-serif font-bold text-text-primary">Live Notes</h2>
            {isSaving && <span className="text-xs text-on-surface-variant">Saving...</span>}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document findings, symptoms, observations..."
            className="flex-1 resize-none p-4 text-sm text-on-surface bg-surface-white focus:outline-none"
          />
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
