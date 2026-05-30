"use client";

/**
 * Route: /appointments — patient appointment management
 *
 * Lists all appointments belonging to the authenticated patient. Supports
 * status-based filtering (Upcoming / Completed / Cancelled / All), inline
 * status updates (e.g. cancel), and live refresh via SSE-driven
 * appointmentTick and a 30-second polling fallback.
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types/api";
import { AppointmentCard } from "@/components/appointment-card/appointment-card";
import { useNotifications } from "@/providers/notification-provider";

type FilterTab = "All" | "Upcoming" | "Completed" | "Cancelled";

/**
 * Renders the patient's appointment list with filter tabs and inline
 * cancel/reschedule actions. Accessible to authenticated patients only.
 * Loads from GET /appointments/patient and re-fetches on appointmentTick
 * (SSE notification) or the 30-second polling interval.
 */
export default function PatientAppointmentsPage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const { appointmentTick } = useNotifications();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("Upcoming");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setLoading(true);
      const data = await apiRequest<Appointment[]>("/appointments/patient", { token });
      // Sort descending by start time
      data.sort((a, b) => new Date(b.slot?.startTime || 0).getTime() - new Date(a.slot?.startTime || 0).getTime());
      setAppointments(data);
    } catch {
      setError("Failed to load your appointments.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchAppointments();
    });
  }, [fetchAppointments]);

  // appointmentTick increments each time a real-time APPOINTMENT_* SSE
  // notification arrives; using it as a dependency triggers a background
  // re-fetch without a full loading spinner (silent=true).
  useEffect(() => {
    if (appointmentTick > 0) queueMicrotask(() => fetchAppointments(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentTick]);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      fetchAppointments(true);
    }, 30_000);
    return () => clearInterval(id);
  }, [token, fetchAppointments]);

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    if (!token) return;
    try {
      setUpdatingId(id);
      setActionError(null);
      await apiRequest(`/appointments/${id}/status`, {
        method: "PATCH",
        token,
        body: { status },
      });
      // Refresh list to show updated status and free slots
      await fetchAppointments();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel appointment.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      if (activeTab === "All") return true;
      if (activeTab === "Upcoming") return appt.status === "PENDING" || appt.status === "CONFIRMED";
      if (activeTab === "Completed") return appt.status === "COMPLETED";
      if (activeTab === "Cancelled") return appt.status === "CANCELLED";
      return true;
    });
  }, [appointments, activeTab]);

  return (
    <DashboardLayout role="patient">
      <div className="animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Appointments</h1>
          <p className="text-on-surface-variant font-sans">
            Manage your past and upcoming consultations.
          </p>
        </div>

        {actionError && (
          <div className="mb-4 bg-red-50 text-error px-5 py-3 rounded-lg border border-red-100 text-sm flex items-center justify-between gap-4">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-error font-bold">✕</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8 bg-surface-white p-2 rounded-xl shadow-sm border border-outline-variant/30 inline-flex">
          {(["Upcoming", "Completed", "Cancelled", "All"] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === tab 
                  ? "bg-primary/10 text-primary" 
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {tab}
            </button>
          ))}
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
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center border border-outline-variant/30 max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-surface-container mx-auto mb-6 flex items-center justify-center">
              <CalendarIcon className="w-10 h-10 text-on-surface-variant/50" />
            </div>
            <h3 className="font-bold font-serif text-2xl text-text-primary mb-3">No {activeTab.toLowerCase()} appointments</h3>
            <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
              {activeTab === "Upcoming" 
                ? "You don't have any upcoming consultations scheduled." 
                : "You don't have any appointments in this category."}
            </p>
            <Button asChild>
              <Link href="/doctors">Book an Appointment</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map(appt => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                role="patient"
                isExpanded={expandedId === appt.id}
                onToggleExpand={() => setExpandedId(expandedId === appt.id ? null : appt.id)}
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
