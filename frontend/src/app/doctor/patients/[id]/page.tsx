"use client";

/**
 * Route: /doctor/patients/[id] — individual patient history view
 *
 * Shows the full appointment history for a single patient identified by the
 * [id] dynamic segment. Loads data from GET /appointments/doctor/patients/:id,
 * which is scoped to the authenticated doctor so patients from other doctors
 * are inaccessible. Supports status filtering and keyword search across
 * appointment text. Accessible to DOCTOR role only.
 */

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";
import { ChevronLeftIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { appointmentText } from "@/components/doctor-patients/patient-history-utils";
import { PatientDetailHeader } from "@/components/doctor-patients/patient-detail-header";
import { PatientHistoryCard } from "@/components/doctor-patients/patient-history-card";
import { FilterChip } from "@/components/doctor-patients/filter-chip";
import type { DoctorPatientHistory, AppointmentStatus } from "@/types/api";

/**
 * Resolves the [id] segment and fetches DoctorPatientHistory (patient
 * demographics + all appointments). Re-fetches whenever the id or auth
 * token changes (e.g. doctor navigates between different patients).
 * Filters are applied client-side against the already-fetched list.
 */
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
    // Reset filters on patient change so stale selections don't carry over.
    setStatusFilter("ALL");
    setSearch("");
    fetchHistory();
  }, [token, status, id, fetchHistory]);

  const patient = data?.patient;
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
            <PatientDetailHeader patient={patient} />

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
                {visibleAppointments.map(appt => (
                  <PatientHistoryCard key={appt.id} appt={appt} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
