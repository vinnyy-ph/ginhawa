"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { DoctorStatsRow } from "@/components/doctor-dashboard/doctor-stats-row";
import { DoctorQuickActions } from "@/components/doctor-dashboard/doctor-quick-actions";
import { DoctorTodaySchedule } from "@/components/doctor-dashboard/doctor-today-schedule";
import type { Appointment } from "@/types/api";

export function DoctorDashboardClient() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const rawName = session?.user?.name?.trim();
  const greetingName = rawName
    ? (/^dr\.?\s/i.test(rawName) ? rawName : `Dr. ${rawName}`)
    : (session?.user?.email?.split('@')[0] ?? 'Doctor');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = React.useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(false);
      const data = await apiRequest<Appointment[]>("/appointments/doctor", { token });
      setAppointments(data);
    } catch (err) {
      console.error("Failed to load doctor dashboard data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

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
    a.slot && new Date(a.slot.startTime).toDateString() === todayStr &&
    a.status !== 'CANCELLED' && a.status !== 'COMPLETED'
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

  if (error) {
    return (
      <DashboardLayout role="doctor">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-xl font-bold font-serif text-text-primary mb-2">
            Couldn&apos;t load your dashboard
          </h2>
          <p className="text-on-surface-variant mb-6">
            We couldn&apos;t reach the server. Your appointments may not be shown.
          </p>
          <Button onClick={() => fetchData()}>Try Again</Button>
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
            Welcome back, {greetingName}
          </h1>
          <p className="text-on-surface-variant font-sans">
            Manage your schedule, appointments, and patient care.
          </p>
        </div>

        <DoctorStatsRow
          total={totalAppointments}
          pending={pendingCount}
          confirmedToday={confirmedToday}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <DoctorQuickActions />
          <DoctorTodaySchedule appointments={todaySchedule} now={now} />
        </div>

      </div>
    </DashboardLayout>
  );
}
