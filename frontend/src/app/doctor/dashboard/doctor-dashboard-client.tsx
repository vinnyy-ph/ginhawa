"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  CalendarIcon,
  BellIcon,
  ClockIcon,
  ChevronRightIcon
} from "@radix-ui/react-icons";
import type { Appointment } from "@/types/api";

const statusColors: Record<string, "secondary" | "success" | "destructive" | "info" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "success",
  CANCELLED: "destructive",
  COMPLETED: "info",
  RESCHEDULED: "outline",
};

export function DoctorDashboardClient() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const doctorName = session?.user?.email?.split('@')[0] || "Doctor";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await apiRequest<Appointment[]>("/appointments/doctor", { token });
        setAppointments(data);
      } catch (err) {
        console.error("Failed to load doctor dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  // Today's date string for comparison
  const todayStr = new Date().toDateString();

  // Stats
  const totalAppointments = appointments.length;
  const pendingCount = appointments.filter(a => a.status === "PENDING").length;
  const confirmedToday = appointments.filter(a =>
    a.status === "CONFIRMED" &&
    a.slot &&
    new Date(a.slot.startTime).toDateString() === todayStr
  ).length;

  // Today's schedule
  const todaySchedule = appointments.filter(a =>
    a.slot && new Date(a.slot.startTime).toDateString() === todayStr
  ).sort((a, b) => new Date(a.slot!.startTime).getTime() - new Date(b.slot!.startTime).getTime());

  if (loading) {
    return (
      <DashboardLayout role="doctor">
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">
            Welcome back, Dr. {doctorName}
          </h1>
          <p className="text-on-surface-variant font-sans">
            Manage your schedule, appointments, and patient care.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 flex items-center justify-between border-0 shadow-soft hover:shadow-lifted transition-shadow">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Total Appointments</p>
              <h3 className="text-3xl font-bold text-text-primary">{totalAppointments}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-on-surface-variant" />
            </div>
          </Card>

          <Card className="p-6 flex items-center justify-between border-0 shadow-soft hover:shadow-lifted transition-shadow">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Pending Requests</p>
              <h3 className="text-3xl font-bold text-[#f59e0b]">{pendingCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#f59e0b]/10 flex items-center justify-center">
              <BellIcon className="w-6 h-6 text-[#f59e0b]" />
            </div>
          </Card>

          <Card className="p-6 flex items-center justify-between border-0 shadow-soft hover:shadow-lifted transition-shadow">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Confirmed Today</p>
              <h3 className="text-3xl font-bold text-primary">{confirmedToday}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircledIcon className="w-6 h-6 text-primary" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold font-serif text-text-primary mb-4">Quick Actions</h2>

            <Link href="/doctor/schedule" className="block group">
              <div className="bg-surface-white p-4 rounded-xl shadow-sm hover:shadow-lifted transition-all flex items-center gap-4 border border-transparent hover:border-primary/20">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#48cab6] to-[#31a795] flex items-center justify-center shrink-0">
                  <ClockIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary group-hover:text-primary transition-colors">My Schedule</h4>
                  <p className="text-xs text-on-surface-variant">Manage your availability slots</p>
                </div>
              </div>
            </Link>

            <Link href="/doctor/appointments" className="block group">
              <div className="bg-surface-white p-4 rounded-xl shadow-sm hover:shadow-lifted transition-all flex items-center gap-4 border border-transparent hover:border-primary/20">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#48cab6] to-[#31a795] flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary group-hover:text-primary transition-colors">All Appointments</h4>
                  <p className="text-xs text-on-surface-variant">View and manage requests</p>
                </div>
              </div>
            </Link>

            <Link href="/doctor/notifications" className="block group">
              <div className="bg-surface-white p-4 rounded-xl shadow-sm hover:shadow-lifted transition-all flex items-center gap-4 border border-transparent hover:border-primary/20">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#48cab6] to-[#31a795] flex items-center justify-center shrink-0">
                  <BellIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary group-hover:text-primary transition-colors">Notifications</h4>
                  <p className="text-xs text-on-surface-variant">System alerts & updates</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Today's Schedule */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-serif text-text-primary">Today&apos;s Schedule</h2>
              <Link href="/doctor/appointments" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                View all <ChevronRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {todaySchedule.length === 0 ? (
              <div className="bg-surface-white rounded-xl shadow-soft p-10 text-center border border-outline-variant/30">
                <div className="w-16 h-16 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-outline" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">No appointments today</h3>
                <p className="text-sm text-on-surface-variant mb-4">You have a free schedule today.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todaySchedule.map(appt => {
                  const pat = appt.patient;
                  const timeStr = appt.slot ? `${new Date(appt.slot.startTime).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : '';

                  return (
                    <div key={appt.id} className="bg-surface-white p-4 rounded-xl shadow-soft flex items-center justify-between border-l-4 border-l-primary/30">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant font-serif font-bold text-xl shrink-0">
                          {pat?.fullName.charAt(0) || 'P'}
                        </div>
                        <div>
                          <h4 className="font-bold text-text-primary">{pat?.fullName || 'Patient'}</h4>
                          <div className="flex items-center gap-2 text-xs text-primary font-semibold mt-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>{timeStr}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Badge variant={statusColors[appt.status] || "outline"}>
                          {appt.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

// Add this to properly render the icon
function CheckCircledIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
