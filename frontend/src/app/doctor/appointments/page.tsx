"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CalendarIcon, ClockIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types/api";

type FilterTab = "All" | "Pending" | "Confirmed" | "Completed" | "Cancelled";

const statusConfig: Record<string, { variant: "secondary" | "success" | "destructive" | "info" | "outline", border: string }> = {
  PENDING: { variant: "secondary", border: "border-l-[#f59e0b]" },
  CONFIRMED: { variant: "success", border: "border-l-primary" },
  CANCELLED: { variant: "destructive", border: "border-l-error" },
  COMPLETED: { variant: "info", border: "border-l-info" },
  RESCHEDULED: { variant: "outline", border: "border-l-outline" },
};

export default function DoctorAppointmentsPage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, [token]);

  async function fetchAppointments() {
    if (!token) return;
    try {
      setLoading(true);
      const data = await apiRequest<Appointment[]>("/appointments/doctor", { token });
      // Sort descending by start time
      data.sort((a, b) => new Date(b.slot?.startTime || 0).getTime() - new Date(a.slot?.startTime || 0).getTime());
      setAppointments(data);
    } catch (err: any) {
      setError("Failed to load your appointments.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: AppointmentStatus) {
    if (!token) return;
    
    // Quick confirmation for Cancel
    if (newStatus === "CANCELLED" && !window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }
    
    try {
      setUpdatingId(id);
      
      // Optimistic update
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      
      await apiRequest(`/appointments/${id}/status`, {
        method: "PATCH",
        token,
        body: { status: newStatus }
      });
      
    } catch (err: any) {
      console.error("Failed to update status", err);
      alert("Failed to update appointment status. Reverting changes.");
      // Revert on failure
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
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center border border-outline-variant/30 max-w-2xl mx-auto">
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
            {filteredAppointments.map(appt => {
              const pat = appt.patient;
              const slot = appt.slot;
              const dateStr = slot ? new Date(slot.startTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date';
              const timeStr = slot ? `${new Date(slot.startTime).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : '';
              const config = statusConfig[appt.status] || { variant: "outline", border: "border-l-outline" };
              const isUpdating = updatingId === appt.id;

              return (
                <div key={appt.id} className={cn(
                  "bg-surface-white rounded-xl shadow-soft overflow-hidden border-l-4 transition-all duration-200 flex flex-col h-full", 
                  config.border,
                  isUpdating ? "opacity-70 pointer-events-none" : ""
                )}>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-text-primary font-serif font-bold text-lg shrink-0">
                          {pat?.fullName.charAt(0) || 'P'}
                        </div>
                        <div>
                          <h3 className="font-bold text-text-primary leading-tight">
                            {pat?.fullName || 'Patient'}
                          </h3>
                          <p className="text-xs text-on-surface-variant">Patient ID: {pat?.id.slice(0,8)}</p>
                        </div>
                      </div>
                      <Badge variant={config.variant} className="capitalize px-2.5 py-0.5 text-[10px]">
                        {appt.status.toLowerCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-text-primary mb-4">
                      <span className="flex items-center gap-1.5 bg-surface px-2.5 py-1.5 rounded-md">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1.5 bg-surface px-2.5 py-1.5 rounded-md">
                        <ClockIcon className="w-3.5 h-3.5 text-primary" />
                        {timeStr}
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Reason for Visit</p>
                      <p className="text-sm text-on-surface-variant bg-surface p-3 rounded-lg line-clamp-3 min-h-[60px]">
                        {appt.reasonForVisit || "No reason provided."}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 bg-surface-container/30 border-t border-outline-variant/20 flex gap-2 justify-end">
                    {appt.status === "PENDING" && (
                      <>
                        <Button variant="destructive" size="sm" onClick={() => updateStatus(appt.id, "CANCELLED")} className="bg-error/10 text-error hover:bg-error/20 border-0">
                          Cancel
                        </Button>
                        <Button variant="default" size="sm" onClick={() => updateStatus(appt.id, "CONFIRMED")}>
                          Confirm Request
                        </Button>
                      </>
                    )}
                    
                    {appt.status === "CONFIRMED" && (
                      <>
                        <Button variant="destructive" size="sm" onClick={() => updateStatus(appt.id, "CANCELLED")} className="bg-error/10 text-error hover:bg-error/20 border-0 mr-auto">
                          Cancel
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/doctor/notes/${appt.id}`}>Add Notes</Link>
                        </Button>
                        <Button size="sm" onClick={() => updateStatus(appt.id, "COMPLETED")} className="bg-[#31a795] text-white hover:bg-[#006b5e]">
                          Mark Complete
                        </Button>
                      </>
                    )}
                    
                    {appt.status === "COMPLETED" && (
                      <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                        <Link href={`/doctor/notes/${appt.id}`}>View / Edit Notes</Link>
                      </Button>
                    )}
                    
                    {appt.status === "CANCELLED" && (
                      <p className="text-xs text-on-surface-variant italic w-full text-center py-1.5">No actions available</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
