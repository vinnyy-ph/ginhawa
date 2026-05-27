"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/api";
import { AppointmentCard } from "@/components/appointment-card";

type FilterTab = "All" | "Upcoming" | "Completed" | "Cancelled";

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
      } catch {
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
            {filteredAppointments.map(appt => (
              <AppointmentCard 
                key={appt.id}
                appointment={appt}
                role="patient"
                isExpanded={expandedId === appt.id}
                onToggleExpand={() => setExpandedId(expandedId === appt.id ? null : appt.id)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
