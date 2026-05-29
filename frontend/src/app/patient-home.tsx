"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { formatPHTime, formatPHDate } from '@/lib/datetime';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  CalendarIcon,
  FileTextIcon,
  BellIcon,
  MagnifyingGlassIcon,
  ActivityLogIcon,
  ChevronRightIcon
} from "@radix-ui/react-icons";
import type { Appointment, Notification } from "@/types/api";

const statusColors: Record<string, "secondary" | "success" | "destructive" | "info" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "success",
  CANCELLED: "destructive",
  COMPLETED: "info",
  RESCHEDULED: "outline",
};

export function PatientHome() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const patientName = session?.user?.name || session?.user?.email?.split('@')[0] || "Patient";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!token) return;
      try {
        setLoading(true);
        const [apptsData, notifsData] = await Promise.all([
          apiRequest<Appointment[]>("/appointments/patient", { token }),
          apiRequest<Notification[]>("/notifications", { token })
        ]);

        // Sort appointments by date descending
        const sortedAppts = apptsData.sort((a, b) =>
          new Date(b.slot?.startTime || 0).getTime() - new Date(a.slot?.startTime || 0).getTime()
        );

        setAppointments(sortedAppts);
        setNotifications(notifsData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  const upcomingCount = appointments.filter(a => a.status === "PENDING" || a.status === "CONFIRMED").length;
  const completedCount = appointments.filter(a => a.status === "COMPLETED").length;
  const unreadCount = notifications.filter(n => n.readAt === null).length;

  const recentAppointments = appointments.slice(0, 3);

  if (loading) {
    return (
      <DashboardLayout role="patient">
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="patient">
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">
            Welcome back, {patientName}
          </h1>
          <p className="text-on-surface-variant font-sans">
            Here&apos;s an overview of your health journey with Ginhawa.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 flex items-center justify-between border-0 shadow-soft hover:shadow-lifted transition-shadow">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Upcoming</p>
              <h2 className="text-3xl font-bold text-primary">{upcomingCount}</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
          </Card>

          <Card className="p-6 flex items-center justify-between border-0 shadow-soft hover:shadow-lifted transition-shadow">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Completed</p>
              <h2 className="text-3xl font-bold text-info">{completedCount}</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
              <FileTextIcon className="w-6 h-6 text-info" />
            </div>
          </Card>

          <Card className="p-6 flex items-center justify-between border-0 shadow-soft hover:shadow-lifted transition-shadow">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Unread Alerts</p>
              <h2 className="text-3xl font-bold text-secondary">{unreadCount}</h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center relative">
              <BellIcon className="w-6 h-6 text-secondary" />
              {unreadCount > 0 && <span className="absolute top-2 right-3 w-2 h-2 rounded-full bg-error animate-pulse" />}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold font-serif text-text-primary mb-4">Quick Actions</h2>

            <Link href="/doctors" className="block group">
              <div className="bg-surface-white p-4 rounded-xl shadow-sm hover:shadow-lifted transition-all flex items-center gap-4 border border-transparent hover:border-primary/20">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-light to-brand flex items-center justify-center shrink-0">
                  <MagnifyingGlassIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">Find a Doctor</h3>
                  <p className="text-xs text-on-surface-variant">Search and book consultations</p>
                </div>
              </div>
            </Link>

            <Link href="/recommendations" className="block group">
              <div className="bg-surface-white p-4 rounded-xl shadow-sm hover:shadow-lifted transition-all flex items-center gap-4 border border-transparent hover:border-primary/20">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-light to-brand flex items-center justify-center shrink-0">
                  <ActivityLogIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">AI Symptom Checker</h3>
                  <p className="text-xs text-on-surface-variant">Find doctors by symptom</p>
                </div>
              </div>
            </Link>

            <Link href="/records" className="block group">
              <div className="bg-surface-white p-4 rounded-xl shadow-sm hover:shadow-lifted transition-all flex items-center gap-4 border border-transparent hover:border-primary/20">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-light to-brand flex items-center justify-center shrink-0">
                  <FileTextIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">My Records</h3>
                  <p className="text-xs text-on-surface-variant">View medical history & notes</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Appointments */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-serif text-text-primary">Recent Appointments</h2>
              <Link href="/appointments" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                View all <ChevronRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {recentAppointments.length === 0 ? (
              <div className="bg-surface-white rounded-xl shadow-soft p-10 text-center border border-outline-variant/30">
                <div className="w-16 h-16 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-outline" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">No appointments yet</h3>
                <p className="text-sm text-on-surface-variant mb-4">Book your first consultation to get started.</p>
                <Link href="/doctors" className="inline-block px-4 py-2 bg-primary text-white text-sm font-semibold rounded-md shadow hover:bg-primary/90">
                  Find a Doctor
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAppointments.map(appt => {
                  const doc = appt.doctor;
                  const dateStr = appt.slot ? formatPHDate(appt.slot.startTime, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unknown Date';
                  const timeStr = appt.slot ? formatPHTime(appt.slot.startTime) : '';

                  return (
                    <div key={appt.id} className="bg-surface-white p-5 rounded-xl shadow-soft flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-l-4 border-l-primary/30 hover:border-l-primary transition-colors">
                      <div className="flex items-center gap-4">
                        {doc?.profilePictureUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={doc.profilePictureUrl} alt={doc.fullName} className="w-12 h-12 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif font-bold text-xl shrink-0">
                            {doc?.fullName.charAt(0) || 'D'}
                          </div>
                        )}
                        <div>
                  <h3 className="font-bold text-text-primary">{doc?.professionalTitle ? `${doc.professionalTitle} ` : ''}{doc?.fullName}</h3>
                          <p className="text-xs text-primary font-medium mb-1">{doc?.specialization}</p>
                          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>{dateStr} at {timeStr}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 sm:mt-0 ml-16 sm:ml-0">
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
