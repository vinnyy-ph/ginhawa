"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types/api";
import { AppointmentCard } from "@/components/appointment-card";

type FilterTab = "All" | "Pending" | "Confirmed" | "Completed" | "Cancelled";

function DoctorAppointmentsContent() {
  const { data: session, status } = useSession();
  const token = session?.user?.accessToken;

  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const initialTab: FilterTab =
    statusParam && (["Pending", "Confirmed", "Completed", "Cancelled", "All"] as string[]).includes(statusParam)
      ? (statusParam as FilterTab)
      : "All";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status]);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      fetchAppointments(true);
    }, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchAppointments(silent = false) {
    if (!token) return;
    try {
      if (!silent) setLoading(true);
      const data = await apiRequest<Appointment[]>("/appointments/doctor", { token });
      // Sort descending by start time
      data.sort((a, b) => new Date(b.slot?.startTime || 0).getTime() - new Date(a.slot?.startTime || 0).getTime());
      setAppointments(data);
    } catch {
      setError("Failed to load your appointments.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: AppointmentStatus, cancelReason?: string) {
    if (!token) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      setUpdatingId(id);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));

      await apiRequest(`/appointments/${id}/status`, {
        method: "PATCH",
        token,
        body: { status: newStatus, ...(cancelReason ? { cancelReason } : {}) }
      });

      setActionSuccess(
        newStatus === 'CONFIRMED'
          ? 'Request confirmed — the patient has been notified.'
          : newStatus === 'CANCELLED'
          ? (cancelReason
              ? 'Request declined — the patient has been notified.'
              : 'Appointment cancelled — the patient has been notified.')
          : 'Appointment updated.',
      );
      setTimeout(() => setActionSuccess(null), 4000);

    } catch (err: unknown) {
      console.error("Failed to update status", err);
      setActionError("Failed to update appointment status. Please try again.");
      fetchAppointments();
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      if (activeTab === "All") return true;
      if (activeTab === "Pending") return appt.status === "PENDING";
      if (activeTab === "Confirmed") return appt.status === "CONFIRMED";
      if (activeTab === "Completed") return appt.status === "COMPLETED";
      if (activeTab === "Cancelled") return appt.status === "CANCELLED";
      return true;
    });
  }, [appointments, activeTab]);

  return (
    <DashboardLayout role="doctor">
      <div className="animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">Appointments</h1>
            <p className="text-on-surface-variant font-sans">
              Manage requests, upcoming consultations, and past records.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/doctor/schedule">Manage Schedule</Link>
          </Button>
        </div>

        {/* Action error banner */}
        {actionError && (
          <div className="mb-4 flex items-center justify-between gap-4 bg-red-50 text-error px-5 py-3 rounded-lg border border-red-100 text-sm">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-error hover:text-error/70 font-semibold shrink-0"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-4 flex items-center justify-between gap-4 bg-success/10 text-success px-5 py-3 rounded-lg border border-success/20 text-sm">
            <span>{actionSuccess}</span>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-success hover:text-success/70 font-semibold shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8 bg-surface-white p-2 rounded-xl shadow-sm border border-outline-variant/30 inline-flex">
          {(["All", "Pending", "Confirmed", "Completed", "Cancelled"] as FilterTab[]).map(tab => {
            const count = appointments.filter(a => 
              tab === "All" ? true : a.status === tab.toUpperCase()
            ).length;
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                  activeTab === tab 
                    ? "bg-primary/10 text-primary" 
                    : "text-on-surface-variant hover:bg-surface-container"
                )}
              >
                {tab}
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  activeTab === tab ? "bg-primary/20" : "bg-outline-variant/30 text-on-surface-variant"
                )}>
                  {count}
                </span>
              </button>
            )
          })}
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
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center border border-outline-variant/30 mx-auto">
            <div className="w-20 h-20 rounded-full bg-surface-container mx-auto mb-6 flex items-center justify-center">
              <CalendarIcon className="w-10 h-10 text-on-surface-variant/50" />
            </div>
            <h3 className="font-bold font-serif text-2xl text-text-primary mb-3">No {activeTab.toLowerCase()} appointments</h3>
            <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
              There are no appointments that match this filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {filteredAppointments.map(appt => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                role="doctor"
                isUpdating={updatingId === appt.id}
                onUpdateStatus={updateStatus}
                token={token}
                onRescheduled={fetchAppointments}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function DoctorAppointmentsPage() {
  return (
    <React.Suspense fallback={null}>
      <DoctorAppointmentsContent />
    </React.Suspense>
  );
}
