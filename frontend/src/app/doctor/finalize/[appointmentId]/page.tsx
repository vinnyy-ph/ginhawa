"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeftIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import type { Appointment, MedicalRecord } from "@/types/api";
import { ConsultationContextCard } from "@/components/finalize/consultation-context-card";
import { PublishedRecordView } from "@/components/finalize/published-record-view";
import { FinalizeRecordForm, type FinalizeForm } from "@/components/finalize/finalize-record-form";

interface AiSummary {
  doctorSummary: string;
  patientSummary: string;
  prescriptions: string;
  followUp: string;
}

const EMPTY_FORM: FinalizeForm = { doctorSummary: '', patientSummary: '', prescriptions: '', followUp: '' };

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

  const [form, setForm] = useState<FinalizeForm>(EMPTY_FORM);
  const setField = (field: keyof FinalizeForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
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
      setForm({
        doctorSummary: data.doctorSummary,
        patientSummary: data.patientSummary,
        prescriptions: data.prescriptions,
        followUp: data.followUp,
      });
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
    setForm({
      doctorSummary: existingRecord.notes ?? '',
      patientSummary: existingRecord.recommendations ?? '',
      prescriptions: existingRecord.prescription ?? '',
      followUp: existingRecord.followUpAdvice ?? '',
    });
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
            notes: form.doctorSummary.trim() || undefined,
            prescription: form.prescriptions.trim() || undefined,
            recommendations: form.patientSummary.trim() || undefined,
            followUpAdvice: form.followUp.trim() || undefined,
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
          notes: form.doctorSummary.trim() || undefined,
          prescription: form.prescriptions.trim() || undefined,
          recommendations: form.patientSummary.trim() || undefined,
          followUpAdvice: form.followUp.trim() || undefined,
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

        <ConsultationContextCard appointment={appointment} />

        {/* Body */}
        {isReadOnly && !amending ? (
          <PublishedRecordView record={existingRecord!} onAmend={startAmend} />
        ) : summarizing ? (
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-on-surface-variant">Generating AI summaries...</p>
          </div>
        ) : (
          <FinalizeRecordForm
            values={form}
            setField={setField}
            amending={amending}
            isPublishing={isPublishing}
            publishSuccess={publishSuccess}
            summarizeError={summarizeError}
            onSummarizeRetry={runSummarize}
            publishError={publishError}
            onPublish={handlePublish}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
