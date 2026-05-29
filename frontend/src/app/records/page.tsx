"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { PatientShell } from "@/components/layout/patient-shell";
import { apiRequest } from "@/lib/api-client";
import { formatPHDate } from '@/lib/datetime';
import { Spinner } from "@/components/ui/spinner";
import { 
  FileTextIcon, 
  HeartIcon, 
  ChatBubbleIcon, 
  CheckCircledIcon,
  CalendarIcon
} from "@radix-ui/react-icons";
import type { MedicalRecord } from "@/types/api";

function RecordsContent() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const highlightId = searchParams.get("appointment");

  useEffect(() => {
    async function fetchRecords() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await apiRequest<MedicalRecord[]>("/medical-records/patient", { token });
        // Sort descending by creation date
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecords(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load your medical records.");
      } finally {
        setLoading(false);
      }
    }
    fetchRecords();
  }, [token]);

  useEffect(() => {
    if (!highlightId || records.length === 0) return;
    const el = document.getElementById(`record-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, records]);

  return (
    <PatientShell>
      <div className="animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">Medical Records</h1>
          <p className="text-on-surface-variant font-sans">
            Your complete consultation history, notes, and prescriptions.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-error p-6 rounded-lg border border-red-100 text-center">
            {error}
          </div>
        ) : records.length === 0 ? (
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center border border-outline-variant/30 max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-surface-container mx-auto mb-6 flex items-center justify-center">
              <FileTextIcon className="w-10 h-10 text-on-surface-variant/50" />
            </div>
            <h3 className="font-bold font-serif text-2xl text-text-primary mb-3">No medical records yet</h3>
            <p className="text-on-surface-variant mb-4 max-w-md mx-auto">
              Medical records will appear here after your doctor completes a consultation and writes their notes.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-primary/20 ml-4 md:ml-6 pl-6 md:pl-10 pb-8 space-y-12">
            {records.map(record => {
              const dateStr = formatPHDate(record.createdAt, {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
              });
              const doc = record.doctor;
              
              return (
                <div key={record.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[33px] md:-left-[49px] top-6 w-4 h-4 rounded-full bg-primary ring-4 ring-surface-white" />
                  
                  <div
                    id={`record-${record.appointmentId}`}
                    className={cn(
                      "bg-surface-white rounded-xl shadow-soft overflow-hidden border hover:shadow-lifted transition-shadow",
                      record.appointmentId === highlightId
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-outline-variant/30",
                    )}
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-5 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-text-primary text-lg">
                          Consultation with {doc?.professionalTitle ? `${doc.professionalTitle} ` : ''}{doc?.fullName || 'Doctor'}
                        </h3>
                        <p className="text-primary text-sm font-semibold">{doc?.specialization}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#31a795] bg-[#31a795]/10 px-2.5 py-1 rounded-full border border-[#31a795]/20">
                          <CheckCircledIcon className="w-3.5 h-3.5" />
                          Doctor Reviewed
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-text-primary bg-surface-white px-3 py-1.5 rounded-md shadow-sm border border-outline-variant/20">
                          <CalendarIcon className="w-4 h-4 text-primary" />
                          {dateStr}
                        </div>
                      </div>
                    </div>
                    
                    {/* Body */}
                    <div className="p-6 space-y-6">
                      
                      {record.notes && (
                        <div>
                          <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                            <ChatBubbleIcon className="w-4 h-4 text-primary" />
                            Consultation Notes
                          </h4>
                          <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
                            {record.notes}
                          </div>
                        </div>
                      )}
                      
                      {record.prescription && (
                        <>
                          <hr className="border-outline-variant/30" />
                          <div>
                            <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                              <HeartIcon className="w-4 h-4 text-[#ba1a1a]" />
                              Prescription
                            </h4>
                            <div className="bg-red-50/50 p-4 rounded-lg text-sm text-on-surface whitespace-pre-line leading-relaxed border border-red-100">
                              {record.prescription}
                            </div>
                          </div>
                        </>
                      )}
                      
                      {record.recommendations && (
                        <>
                          <hr className="border-outline-variant/30" />
                          <div>
                            <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                              <FileTextIcon className="w-4 h-4 text-info" />
                              Recommendations
                            </h4>
                            <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
                              {record.recommendations}
                            </div>
                          </div>
                        </>
                      )}
                      
                      {record.followUpAdvice && (
                        <>
                          <hr className="border-outline-variant/30" />
                          <div>
                            <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
                              <CheckCircledIcon className="w-4 h-4 text-primary" />
                              Follow-up Advice
                            </h4>
                            <div className="bg-primary/5 p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed border border-primary/10">
                              {record.followUpAdvice}
                            </div>
                          </div>
                        </>
                      )}
                      
                    </div>
                    
                    {/* Footer */}
                    {record.appointment?.reasonForVisit && (
                      <div className="bg-surface px-6 py-3 border-t border-outline-variant/30 text-xs text-on-surface-variant flex items-start gap-2">
                        <span className="font-bold uppercase tracking-wider text-outline shrink-0 mt-0.5">Reason for visit:</span>
                        <span>{record.appointment.reasonForVisit}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PatientShell>
  );
}

export default function PatientRecordsPage() {
  return (
    <Suspense fallback={null}>
      <RecordsContent />
    </Suspense>
  );
}
