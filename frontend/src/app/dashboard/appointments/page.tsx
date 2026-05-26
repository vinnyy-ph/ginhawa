"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CalendarIcon, ChevronDownIcon, ClockIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/api";

type FilterTab = "All" | "Upcoming" | "Completed" | "Cancelled";

const statusConfig: Record<string, { variant: "secondary" | "success" | "destructive" | "info" | "outline", border: string }> = {
  PENDING: { variant: "secondary", border: "border-l-[#f59e0b]" },
  CONFIRMED: { variant: "success", border: "border-l-primary" },
  CANCELLED: { variant: "destructive", border: "border-l-error" },
  COMPLETED: { variant: "info", border: "border-l-info" },
  RESCHEDULED: { variant: "outline", border: "border-l-outline" },
};

export default function PatientAppointmentsPage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("Upcoming");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAppointments() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await apiRequest<Appointment[]>("/appointments/patient", { token });
        // Sort descending by start time
        data.sort((a, b) => new Date(b.slot?.startTime || 0).getTime() - new Date(a.slot?.startTime || 0).getTime());
        setAppointments(data);
      } catch (err: any) {
        setError("Failed to load your appointments.");
      } finally {
        setLoading(false);
      }
    }
    fetchAppointments();
  }, [token]);

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
            {filteredAppointments.map(appt => {
              const doc = appt.doctor;
              const slot = appt.slot;
              const dateStr = slot ? new Date(slot.startTime).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown Date';
              const timeStr = slot ? `${new Date(slot.startTime).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })} - ${new Date(slot.endTime).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : '';
              const config = statusConfig[appt.status] || { variant: "outline", border: "border-l-outline" };
              const isExpanded = expandedId === appt.id;

              return (
                <div key={appt.id} className={cn("bg-surface-white rounded-xl shadow-soft overflow-hidden border-l-4 transition-all duration-200", config.border)}>
                  {/* Card Header (Always visible) */}
                  <div 
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-container/30"
                    onClick={() => setExpandedId(isExpanded ? null : appt.id)}
                  >
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary font-serif font-bold text-xl shrink-0">
                        {doc?.fullName.charAt(0) || 'D'}
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary text-lg leading-tight">
                          {doc?.professionalTitle ? `${doc.professionalTitle} ` : ''}{doc?.fullName}
                        </h3>
                        <p className="text-sm text-on-surface-variant mb-1">{doc?.specialization}</p>
                        <div className="flex items-center gap-4 text-xs font-semibold text-text-primary mt-2">
                          <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md">
                            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                            {dateStr}
                          </span>
                          <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md">
                            <ClockIcon className="w-3.5 h-3.5 text-primary" />
                            {timeStr}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end sm:w-auto w-full gap-4">
                      <Badge variant={config.variant} className="capitalize px-3 py-1 text-xs">
                        {appt.status.toLowerCase()}
                      </Badge>
                      <button className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5">
                        <ChevronDownIcon className={cn("w-5 h-5 transition-transform duration-200", isExpanded && "rotate-180")} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <div 
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="p-5 pt-0 border-t border-outline-variant/30 mt-2">
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Reason for Visit</p>
                          <p className="text-sm text-on-surface-variant bg-surface p-3 rounded-lg min-h-[60px]">
                            {appt.reasonForVisit || "No reason provided."}
                          </p>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Booking Reference</p>
                            <p className="text-sm font-mono text-on-surface-variant">{appt.id}</p>
                          </div>
                          
                          {(appt.status === "PENDING" || appt.status === "CONFIRMED") && (
                            <div>
                              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Actions</p>
                              <div className="flex gap-2">
                                <Button disabled variant="outline" size="sm" className="opacity-50 cursor-not-allowed">
                                  Reschedule
                                </Button>
                                <Button disabled variant="destructive" size="sm" className="opacity-50 cursor-not-allowed bg-error/10 text-error border-0">
                                  Cancel
                                </Button>
                              </div>
                              <p className="text-xs text-on-surface-variant mt-2 italic">* Online cancellation coming soon. Please contact the clinic.</p>
                            </div>
                          )}
                          
                          {appt.status === "COMPLETED" && (
                            <div>
                              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                                <Link href="/dashboard/records">View Medical Record</Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
