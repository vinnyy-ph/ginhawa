"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  PersonIcon,
  CheckCircledIcon,
  ChatBubbleIcon,
  HeartIcon,
  FileTextIcon,
  ExclamationTriangleIcon
} from "@radix-ui/react-icons";
import type { Appointment, MedicalRecord } from "@/types/api";

export default function DoctorNotesPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;
  
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [existingRecord, setExistingRecord] = useState<MedicalRecord | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [followUpAdvice, setFollowUpAdvice] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!token || !appointmentId) return;
      try {
        setLoading(true);

        const [appt, recordsData] = await Promise.all([
          apiRequest<Appointment>(`/appointments/${appointmentId}`, { token }),
          apiRequest<MedicalRecord[]>("/medical-records/doctor", { token }),
        ]);

        setAppointment(appt);

        const record = recordsData.find(r => r.appointmentId === appointmentId);
        if (record) {
          setExistingRecord(record);
          setNotes(record.notes || "");
          setPrescription(record.prescription || "");
          setRecommendations(record.recommendations || "");
          setFollowUpAdvice(record.followUpAdvice || "");
        }
      } catch (err) {
        console.error(err);
        setError("Appointment not found or you don't have permission to view it.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [token, appointmentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || existingRecord) return;
    
    try {
      setIsSubmitting(true);
      setFormError(null);
      
      await apiRequest("/medical-records", {
        method: "POST",
        token,
        body: {
          appointmentId,
          notes: notes.trim() || undefined,
          prescription: prescription.trim() || undefined,
          recommendations: recommendations.trim() || undefined,
          followUpAdvice: followUpAdvice.trim() || undefined
        }
      });
      
      setSubmitSuccess(true);
      
      setTimeout(() => {
        router.push("/doctor/appointments");
      }, 2000);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save medical record.";
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
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

  const pat = appointment.patient;
  const slot = appointment.slot;
  const dateStr = slot ? new Date(slot.startTime).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown Date';
  
  return (
    <DashboardLayout role="doctor">
      <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
        
        {/* Toast */}
        {submitSuccess && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-success text-white px-6 py-3 rounded-lg shadow-lifted flex items-center gap-3">
              <CheckCircledIcon className="w-5 h-5" />
              <span className="font-medium">Medical record saved successfully! Redirecting...</span>
            </div>
          </div>
        )}

        <div className="mb-6">
          <Link href="/doctor/appointments" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-4">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Appointments
          </Link>
          <h1 className="text-3xl font-bold font-serif text-text-primary">
            {existingRecord ? "View Medical Record" : "Write Consultation Notes"}
          </h1>
        </div>

        {/* Context Card */}
        <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6 mb-8 flex flex-col md:flex-row gap-6 items-start">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-text-primary font-serif font-bold text-2xl shrink-0">
            {pat?.fullName.charAt(0) || 'P'}
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Patient</p>
              <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
                <PersonIcon className="w-4 h-4 text-on-surface-variant" />
                {pat?.fullName || 'Unknown Patient'}
              </h3>
              <p className="text-sm text-on-surface-variant mt-1">ID: {pat?.id.slice(0,8)}</p>
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

        {/* Form / View */}
        <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
          <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30">
            <h3 className="font-serif text-lg font-bold text-text-primary">Clinical Documentation</h3>
            {existingRecord && <p className="text-sm text-on-surface-variant mt-1">This record is saved and read-only.</p>}
          </div>
          
          <div className="p-6">
            {existingRecord ? (
              // Read-only view
              <div className="space-y-8">
                {existingRecord.notes && (
                  <div>
                    <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                      <ChatBubbleIcon className="w-4 h-4 text-primary" /> Consultation Notes
                    </h4>
                    <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
                      {existingRecord.notes}
                    </div>
                  </div>
                )}
                
                {existingRecord.prescription && (
                  <div>
                    <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                      <HeartIcon className="w-4 h-4 text-[#ba1a1a]" /> Prescription
                    </h4>
                    <div className="bg-red-50 p-4 rounded-lg text-sm text-on-surface whitespace-pre-line leading-relaxed border border-red-100">
                      {existingRecord.prescription}
                    </div>
                  </div>
                )}
                
                {existingRecord.recommendations && (
                  <div>
                    <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                      <FileTextIcon className="w-4 h-4 text-info" /> Recommendations
                    </h4>
                    <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
                      {existingRecord.recommendations}
                    </div>
                  </div>
                )}
                
                {existingRecord.followUpAdvice && (
                  <div>
                    <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                      <CheckCircledIcon className="w-4 h-4 text-primary" /> Follow-up Advice
                    </h4>
                    <div className="bg-primary/5 p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed border border-primary/10">
                      {existingRecord.followUpAdvice}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Editable form
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="notes" className="block text-sm font-bold font-serif text-text-primary mb-2">
                    <ChatBubbleIcon className="w-4 h-4 text-primary inline mr-2 align-text-bottom" />
                    Consultation Notes
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Document findings, symptoms observed, diagnosis..."
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-surface min-h-[120px]"
                  />
                </div>
                
                <div>
                  <label htmlFor="prescription" className="block text-sm font-bold font-serif text-text-primary mb-2">
                    <HeartIcon className="w-4 h-4 text-[#ba1a1a] inline mr-2 align-text-bottom" />
                    Prescription
                  </label>
                  <textarea
                    id="prescription"
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    placeholder="Medication name, dosage, frequency..."
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-surface min-h-[100px]"
                  />
                </div>
                
                <div>
                  <label htmlFor="recommendations" className="block text-sm font-bold font-serif text-text-primary mb-2">
                    <FileTextIcon className="w-4 h-4 text-info inline mr-2 align-text-bottom" />
                    Recommendations
                  </label>
                  <textarea
                    id="recommendations"
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    placeholder="Lifestyle changes, follow-up tests, referrals..."
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-surface min-h-[100px]"
                  />
                </div>
                
                <div>
                  <label htmlFor="followUpAdvice" className="block text-sm font-bold font-serif text-text-primary mb-2">
                    <CheckCircledIcon className="w-4 h-4 text-primary inline mr-2 align-text-bottom" />
                    Follow-up Advice
                  </label>
                  <textarea
                    id="followUpAdvice"
                    value={followUpAdvice}
                    onChange={(e) => setFollowUpAdvice(e.target.value)}
                    placeholder="Schedule follow-up in X weeks, monitor symptoms..."
                    className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-surface min-h-[80px]"
                  />
                </div>
                
                {formError && (
                  <div className="bg-red-50 text-error p-3 rounded-md text-sm border border-red-100">
                    {formError}
                  </div>
                )}
                
                <div className="pt-4 flex justify-end gap-3 border-t border-outline-variant/30">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/doctor/appointments">Cancel</Link>
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || (!notes.trim() && !prescription.trim() && !recommendations.trim() && !followUpAdvice.trim())}
                    className="min-w-[150px]"
                  >
                    {isSubmitting ? "Saving..." : "Save Medical Record"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
