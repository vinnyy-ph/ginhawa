"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircledIcon, ExclamationTriangleIcon, MagicWandIcon } from "@radix-ui/react-icons";

interface AiSummary {
  doctorSummary: string;
  patientSummary: string;
  prescriptions: string;
  followUp: string;
}

export default function FinalizeConsultationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const resolvedParams = use(params);
  const appointmentId = resolvedParams.appointmentId;
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [doctorSummary, setDoctorSummary] = useState('');
  const [patientSummary, setPatientSummary] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [followUp, setFollowUp] = useState('');

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function fetchSummary() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AiSummary>(`/consultation/${appointmentId}/summarize`, {
        method: 'POST',
        token,
      });
      setDoctorSummary(data.doctorSummary);
      setPatientSummary(data.patientSummary);
      setPrescriptions(data.prescriptions);
      setFollowUp(data.followUp);
    } catch {
      setError('AI summarization failed. You can try again or publish manually.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handlePublish() {
    if (!token) return;
    setIsPublishing(true);
    try {
      await apiRequest('/medical-records', {
        method: 'POST',
        token,
        body: {
          appointmentId,
          notes: doctorSummary.trim() || undefined,
          prescription: prescriptions.trim() || undefined,
          recommendations: patientSummary.trim() || undefined,
          followUpAdvice: followUp.trim() || undefined,
        },
      });
      await apiRequest(`/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        token,
        body: { status: 'COMPLETED' },
      });
      setPublishSuccess(true);
      setTimeout(() => router.push('/doctor/appointments'), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish record.';
      setPublishError(msg);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500">

        {publishSuccess && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-success text-white px-6 py-3 rounded-lg shadow-lifted flex items-center gap-3">
              <CheckCircledIcon className="w-5 h-5" />
              <span className="font-medium">Record published! Redirecting...</span>
            </div>
          </div>
        )}

        <div className="mb-6">
          <Link href="/doctor/appointments" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-4">
            ← Back to Appointments
          </Link>
          <div className="flex items-center gap-3">
            <MagicWandIcon className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold font-serif text-text-primary">Finalize Consultation</h1>
          </div>
          <p className="text-sm text-on-surface-variant mt-1 ml-9">Review and edit the AI-generated summaries before publishing.</p>
        </div>

        {loading ? (
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-on-surface-variant">Generating AI summaries...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-error p-6 rounded-xl border border-red-100 text-center">
            <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-3" />
            <p className="font-medium mb-4">{error}</p>
            <Button onClick={fetchSummary} variant="outline">Try Again</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {publishError && (
              <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm border border-yellow-200">
                {publishError}
              </div>
            )}

            <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
              <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30">
                <h3 className="font-serif text-lg font-bold text-text-primary">Clinical Documentation (AI-Generated)</h3>
                <p className="text-xs text-on-surface-variant mt-1">Edit as needed before publishing to the patient record.</p>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Doctor Summary (Clinical)</label>
                  <textarea
                    value={doctorSummary}
                    onChange={e => setDoctorSummary(e.target.value)}
                    rows={5}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Patient Summary (Plain Language)</label>
                  <textarea
                    value={patientSummary}
                    onChange={e => setPatientSummary(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Prescriptions</label>
                  <textarea
                    value={prescriptions}
                    onChange={e => setPrescriptions(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Follow-up Recommendations</label>
                  <textarea
                    value={followUp}
                    onChange={e => setFollowUp(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pb-8">
              <Button variant="outline" asChild>
                <Link href="/doctor/appointments">Cancel</Link>
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing || publishSuccess}
                className="min-w-[160px] bg-[#31a795] text-white hover:bg-[#006b5e]"
              >
                {isPublishing ? 'Publishing...' : 'Publish to Patient Record'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
