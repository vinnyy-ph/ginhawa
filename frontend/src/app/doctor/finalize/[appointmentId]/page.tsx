"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { formatPHDate } from '@/lib/datetime';
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeftIcon,
  CalendarIcon,
  PersonIcon,
  CheckCircledIcon,
  ChatBubbleIcon,
  FileTextIcon,
  ExclamationTriangleIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import type { Appointment, MedicalRecord } from "@/types/api";
import { PrescriptionDisplay } from "@/components/prescription-display";

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

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [existingRecord, setExistingRecord] = useState<MedicalRecord | null>(null);

  // AI summarize (only runs when no record exists yet)
  const [summarizing, setSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  const [doctorSummary, setDoctorSummary] = useState('');
  const [patientSummary, setPatientSummary] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [followUp, setFollowUp] = useState('');

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [attested, setAttested] = useState(false);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [amending, setAmending] = useState(false);

  async function runSummarize() {
    if (!token) return;
    setSummarizing(true);
    setSummarizeError(null);
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
      setSummarizeError('AI summarization failed. Write the record manually below, or try again.');
    } finally {
      setSummarizing(false);
    }
  }

  useEffect(() => {
    async function init() {
      if (!token) return;
      setLoading(true);
      setError(null);

      // 1. Appointment context
      try {
        const appt = await apiRequest<Appointment>(`/appointments/${appointmentId}`, { token });
        setAppointment(appt);
      } catch {
        setError("Appointment not found or you don't have permission to view it.");
        setLoading(false);
        return;
      }

      // 2. Existing-record guard — runs BEFORE any AI call
      let record: MedicalRecord | undefined;
      try {
        const records = await apiRequest<MedicalRecord[]>("/medical-records/doctor", { token });
        record = records.find(r => r.appointmentId === appointmentId);
      } catch {
        // non-fatal: treat as no record
      }

      if (record) {
        setExistingRecord(record);
        setAmending(false);
        setLoading(false);
        return;
      }

      // 3. No record yet → AI prefill for editable form
      setLoading(false);
      runSummarize();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, appointmentId]);

  function startAmend() {
    if (!existingRecord) return;
    setDoctorSummary(existingRecord.notes ?? '');
    setPatientSummary(existingRecord.recommendations ?? '');
    setPrescriptions(existingRecord.prescription ?? '');
    setFollowUp(existingRecord.followUpAdvice ?? '');
    setAttested(false);
    setConfirmingPublish(false);
    setPublishError(null);
    setAmending(true);
  }

  async function handlePublish() {
    if (!token) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      if (existingRecord) {
        await apiRequest(`/medical-records/${existingRecord.id}`, {
          method: 'PATCH',
          token,
          body: {
            notes: doctorSummary.trim() || undefined,
            prescription: prescriptions.trim() || undefined,
            recommendations: patientSummary.trim() || undefined,
            followUpAdvice: followUp.trim() || undefined,
          },
        });
        setPublishSuccess(true);
        setTimeout(() => router.push('/doctor/appointments'), 2000);
        return;
      }
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

  if (loading) {
    return (
      <DashboardLayout role="doctor">
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  if (error || !appointment) {
    return (
      <DashboardLayout role="doctor">
        <div className="bg-red-50 text-error p-6 rounded-lg border border-red-100 text-center max-w-lg mx-auto mt-10">
          <ExclamationTriangleIcon className="w-10 h-10 mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Error Loading Data</h3>
          <p>{error}</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/doctor/appointments">Back to Appointments</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isReadOnly = !!existingRecord;
  const pat = appointment.patient;
  const slot = appointment.slot;
  const dateStr = slot
    ? formatPHDate(slot.startTime, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown Date';

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500">

        {publishSuccess && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-success text-white px-6 py-3 rounded-lg shadow-lifted flex items-center gap-3">
              <CheckCircledIcon className="w-5 h-5" />
              <span className="font-medium">{amending ? 'Record updated! Redirecting...' : 'Record published! Redirecting...'}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <Link href="/doctor/appointments" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-4">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Appointments
          </Link>
          <div className="flex items-center gap-3">
            <MagicWandIcon className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold font-serif text-text-primary">
              {isReadOnly ? "Medical Record" : "Finalize Consultation"}
            </h1>
          </div>
          {!isReadOnly && (
            <p className="text-sm text-on-surface-variant mt-1 ml-9">Review and edit the AI-generated summaries before publishing.</p>
          )}
        </div>

        {/* Context header */}
        <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-5 mb-6 flex flex-col md:flex-row gap-5 items-start">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-text-primary font-serif font-bold text-xl shrink-0">
            {pat?.fullName.charAt(0) || 'P'}
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Patient</p>
              <h3 className="font-bold text-text-primary flex items-center gap-2">
                <PersonIcon className="w-4 h-4 text-on-surface-variant" />
                {pat?.fullName || 'Unknown Patient'}
              </h3>
            </div>
            <div>
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Consultation Date</p>
              <p className="font-medium flex items-center gap-2 text-text-primary">
                <CalendarIcon className="w-4 h-4 text-primary" />
                {dateStr}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Reason for Visit</p>
              <p className="text-sm text-on-surface-variant bg-surface p-3 rounded-lg">
                {appointment.reasonForVisit || "No reason provided."}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        {isReadOnly && !amending ? (
          <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
            <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-text-primary">Clinical Documentation</h3>
                <p className="text-sm text-on-surface-variant mt-1">This record is published. You can amend it if needed.</p>
              </div>
              <Button variant="outline" size="sm" onClick={startAmend}>Amend record</Button>
            </div>
            <div className="p-6 space-y-8">
              {existingRecord!.notes && (
                <div>
                  <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                    <ChatBubbleIcon className="w-4 h-4 text-primary" /> Consultation Notes
                  </h4>
                  <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
                    {existingRecord!.notes}
                  </div>
                </div>
              )}
              {(existingRecord!.prescriptions?.length || existingRecord!.prescription) && (
                <PrescriptionDisplay prescriptions={existingRecord!.prescriptions} fallbackText={existingRecord!.prescription} />
              )}
              {existingRecord!.recommendations && (
                <div>
                  <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                    <FileTextIcon className="w-4 h-4 text-info" /> Recommendations
                  </h4>
                  <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
                    {existingRecord!.recommendations}
                  </div>
                </div>
              )}
              {existingRecord!.followUpAdvice && (
                <div>
                  <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                    <CheckCircledIcon className="w-4 h-4 text-primary" /> Follow-up Advice
                  </h4>
                  <div className="bg-primary/5 p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed border border-primary/10">
                    {existingRecord!.followUpAdvice}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : summarizing ? (
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-on-surface-variant">Generating AI summaries...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {summarizeError && (
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm border border-yellow-200 flex items-center justify-between gap-3">
                <span>{summarizeError}</span>
                <Button onClick={runSummarize} variant="outline" size="sm">Try Again</Button>
              </div>
            )}

            {publishError && (
              <div className="bg-red-50 text-error p-3 rounded-lg text-sm border border-red-100">
                {publishError}
              </div>
            )}

            {!amending && (
              <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm">
                <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  <strong>AI-generated draft.</strong> Review and verify every field — especially the
                  prescription — before publishing. Publishing signs this into the patient&apos;s
                  permanent medical record.
                </p>
              </div>
            )}

            <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
              <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30">
                <h3 className="font-serif text-lg font-bold text-text-primary">Clinical Documentation</h3>
                <p className="text-xs text-on-surface-variant mt-1">Edit as needed before publishing to the patient record.</p>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Consultation Notes</label>
                  <textarea
                    value={doctorSummary}
                    onChange={e => setDoctorSummary(e.target.value)}
                    rows={5}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Recommendations (plain language for the patient)</label>
                  <textarea
                    value={patientSummary}
                    onChange={e => setPatientSummary(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Prescription</label>
                  <textarea
                    value={prescriptions}
                    onChange={e => setPrescriptions(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold font-serif text-text-primary mb-2">Follow-up Advice</label>
                  <textarea
                    value={followUp}
                    onChange={e => setFollowUp(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pb-8">
              <label className="flex items-start gap-3 text-sm text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={attested}
                  onChange={e => { setAttested(e.target.checked); setConfirmingPublish(false); }}
                  className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <span>I have reviewed the above and verified its clinical accuracy, including any prescription.</span>
              </label>

              <div className="flex justify-end gap-3 items-center flex-wrap">
                <Button variant="outline" asChild>
                  <Link href="/doctor/appointments">Cancel</Link>
                </Button>
                {!confirmingPublish ? (
                  <Button
                    onClick={() => setConfirmingPublish(true)}
                    disabled={!attested || isPublishing || publishSuccess}
                    className="min-w-[160px] bg-[#31a795] text-white hover:bg-[#006b5e]"
                  >
                    {amending ? 'Save amendment' : 'Publish to Patient Record'}
                  </Button>
                ) : (
                  <>
                    <span className="text-sm text-on-surface-variant">{amending ? 'Save changes to this record?' : "Publish to the patient's permanent record?"}</span>
                    <Button variant="outline" onClick={() => setConfirmingPublish(false)} disabled={isPublishing}>
                      Back
                    </Button>
                    <Button
                      onClick={handlePublish}
                      disabled={isPublishing || publishSuccess}
                      className="bg-[#31a795] text-white hover:bg-[#006b5e]"
                    >
                      {isPublishing ? (amending ? 'Saving...' : 'Publishing...') : (amending ? 'Confirm amend' : 'Confirm publish')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
