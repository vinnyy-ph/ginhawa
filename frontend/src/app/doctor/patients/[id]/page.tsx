"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { formatPHTime, formatPHDate } from '@/lib/datetime';
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { ChevronLeftIcon, FileTextIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import type {
  DoctorPatientHistory,
  Appointment,
  AppointmentStatus,
} from "@/types/api";

const statusVariant: Record<
  AppointmentStatus,
  "default" | "secondary" | "destructive" | "success" | "info" | "outline"
> = {
  PENDING: "secondary",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "destructive",
  RESCHEDULED: "outline",
};

function patientAge(birthdate?: string): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (isNaN(b.getTime())) return null;
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function appointmentText(appt: Appointment): string {
  const rec = appt.medicalRecord;
  return [
    appt.reasonForVisit,
    rec?.notes,
    rec?.recommendations,
    rec?.followUpAdvice,
    rec?.prescription,
    ...(rec?.prescriptions ?? []).flatMap(rx => [
      rx.drugName,
      rx.dosage,
      rx.frequency,
      rx.instructions,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function ConsultationDetails({ appt }: { appt: Appointment }) {
  const record = appt.medicalRecord;

  if (appt.status !== "COMPLETED" && !record) {
    return (
      <p className="text-sm text-on-surface-variant italic">
        No consultation record yet.
      </p>
    );
  }

  if (!record) {
    return (
      <p className="text-sm text-on-surface-variant italic">
        Consultation completed — no notes were recorded.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {record.notes && (
        <Field label="Doctor's notes" value={record.notes} />
      )}
      {record.recommendations && (
        <Field label="Recommendations" value={record.recommendations} />
      )}
      {record.followUpAdvice && (
        <Field label="Follow-up advice" value={record.followUpAdvice} />
      )}
      {record.prescription && (
        <Field label="Prescription" value={record.prescription} />
      )}

      {record.prescriptions && record.prescriptions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
            Prescribed medication
          </p>
          <ul className="space-y-1.5">
            {record.prescriptions.map(rx => (
              <li
                key={rx.id}
                className="bg-surface-container rounded-lg px-3 py-2 text-text-primary"
              >
                <span className="font-semibold">{rx.drugName}</span>{" "}
                <span className="text-on-surface-variant">
                  — {rx.dosage}, {rx.frequency}
                  {rx.durationDays ? ` for ${rx.durationDays} days` : ""}
                </span>
                {rx.instructions && (
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {rx.instructions}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-text-primary whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm rounded-full px-3 py-1 border transition-colors ${active
          ? "bg-primary text-on-primary border-primary"
          : "bg-surface-white text-on-surface-variant border-outline/40 hover:border-primary/50"
        }`}
    >
      {label} <span className="font-semibold">{count}</span>
    </button>
  );
}

export default function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const token = session?.user?.accessToken;

  const [data, setData] = useState<DoctorPatientHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const fetchHistory = React.useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await apiRequest<DoctorPatientHistory>(
        `/appointments/doctor/patients/${id}`,
        { token },
      );
      setError(null);
      setData(res);
    } catch {
      setError("Could not load this patient. They may not be in your care.");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (status === "loading") return;
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    setStatusFilter("ALL");
    setSearch("");
    fetchHistory();
  }, [token, status, id, fetchHistory]);

  const patient = data?.patient;
  const age = patientAge(patient?.birthdate);

  const appointments = data?.appointments ?? [];

  const statusCounts = appointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const q = search.trim().toLowerCase();
  const visibleAppointments = appointments.filter(a => {
    const statusOk = statusFilter === "ALL" || a.status === statusFilter;
    const searchOk = !q || appointmentText(a).includes(q);
    return statusOk && searchOk;
  });

  return (
    <DashboardLayout role="doctor">
      <div className="mx-auto">
        <Link
          href="/doctor/patients"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-4"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to patients
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : error || !patient ? (
          <div className="bg-surface-white p-8 rounded-xl shadow-soft text-center text-on-surface-variant">
            {error ?? "Patient not found."}
          </div>
        ) : (
          <>
            {/* Patient header */}
            <div className="bg-surface-white p-6 rounded-xl shadow-soft flex items-center gap-5 mb-6">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant font-serif font-bold text-2xl shrink-0">
                {patient.fullName.charAt(0) || "P"}
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold text-text-primary">
                  {patient.fullName}
                </h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  {age !== null && <span>{age} yrs</span>}
                  {patient.phoneNumber && <span> · {patient.phoneNumber}</span>}
                  {(patient.city || patient.region) && (
                    <span>
                      {" "}
                      · {[patient.city, patient.region].filter(Boolean).join(", ")}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {patient.medicalHistory && (
              <div className="bg-surface-white p-5 rounded-xl shadow-soft mb-6">
                <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  Medical history
                </h2>
                <p className="text-text-primary whitespace-pre-wrap text-sm">
                  {patient.medicalHistory}
                </p>
              </div>
            )}

            {/* Appointment / consultation history */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold text-text-primary">
                Appointment history{" "}
                {statusFilter === "ALL" && !search.trim()
                  ? `(${appointments.length})`
                  : `(showing ${visibleAppointments.length} of ${appointments.length})`}
              </h2>
              <div className="relative w-full sm:w-64">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search visits…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline/40 bg-surface-white text-text-primary text-sm placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <FilterChip
                label="All"
                count={appointments.length}
                active={statusFilter === "ALL"}
                onClick={() => setStatusFilter("ALL")}
              />
              {(Object.keys(statusCounts) as AppointmentStatus[]).map(s => (
                <FilterChip
                  key={s}
                  label={s.charAt(0) + s.slice(1).toLowerCase()}
                  count={statusCounts[s]}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                />
              ))}
            </div>

            {appointments.length === 0 ? (
              <p className="text-on-surface-variant">No appointments yet.</p>
            ) : visibleAppointments.length === 0 ? (
              <p className="text-on-surface-variant">
                No appointments match these filters.
              </p>
            ) : (
              <div className="space-y-4">
                {visibleAppointments.map(appt => {
                  const start = appt.slot ? new Date(appt.slot.startTime) : null;
                  return (
                    <div
                      key={appt.id}
                      className="bg-surface-white rounded-xl shadow-soft overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-4 border-b border-outline/20">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                            <FileTextIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary">
                              {start
                                ? formatPHDate(start, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                                : "Date TBD"}
                            </p>
                            {start && (
                              <p className="text-xs text-on-surface-variant">
                                {formatPHTime(start)}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={statusVariant[appt.status] ?? "outline"}>
                          {appt.status}
                        </Badge>
                      </div>

                      <div className="p-4 space-y-3">
                        {appt.reasonForVisit && (
                          <Field
                            label="Reason for visit"
                            value={appt.reasonForVisit}
                          />
                        )}
                        <ConsultationDetails appt={appt} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
