"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest, ApiError } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { WeeklyTemplateForm } from "@/components/schedule/weekly-template-form";
import { ScheduleToast } from "@/components/schedule/schedule-toast";
import type { GeneratedSlot } from "@/lib/generate-slots";
import type { AvailabilitySlot, DoctorProfile, SlotStatus, Appointment } from "@/types/api";

export default function DoctorSchedulePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const router = useRouter();

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!token) return;
      try {
        setLoading(true);
        const profileData = await apiRequest<DoctorProfile>("/doctors/profile", { token });
        setProfile(profileData);
        if (profileData?.id) {
          await fetchSlots(profileData.id);
        }
        // Fetch appointments to build slotId → patientName map
        try {
          const appts = await apiRequest<Appointment[]>("/appointments/doctor", { token });
          const names: Record<string, string> = {};
          for (const appt of appts) {
            if (appt.slotId && appt.patient?.fullName) {
              names[appt.slotId] = appt.patient.fullName;
            }
          }
          setPatientNames(names);
        } catch {
          // Graceful degradation: patient names won't show in booked slots
        }
      } catch (err) {
        console.error(err);
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/onboarding/doctor");
          return;
        }
        setError("Failed to load your schedule.");
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  async function fetchSlots(doctorId: string) {
    const data = await apiRequest<AvailabilitySlot[]>(`/doctors/${doctorId}/slots`);
    data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    setSlots(data);
  }

  async function handleUpdateStatus(id: string, status: SlotStatus) {
    if (!token || !profile) return;
    try {
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      await apiRequest(`/doctors/slots/${id}`, {
        method: "PATCH",
        token,
        body: { status },
      });
      setToastMessage(`Slot marked as ${status.toLowerCase()}`);
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to update slot. Changes reverted.");
      await fetchSlots(profile.id);
    }
  }

  async function handleDeleteSlot(id: string) {
    if (!token || !profile) return;
    try {
      await apiRequest(`/doctors/slots/${id}`, { method: "DELETE", token });
      setSlots((prev) => prev.filter((s) => s.id !== id));
      setToastMessage("Slot deleted");
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to delete slot. Please try again.");
      await fetchSlots(profile.id);
    }
  }

  async function handleSlotChange() {
    if (!profile) return;
    await fetchSlots(profile.id);
    setToastMessage("Slot added");
  }

  async function handleGenerateSlots(generated: GeneratedSlot[]) {
    if (!token || !profile) return;
    const result = await apiRequest<{ created: number; skipped: number }>(
      "/doctors/slots/bulk",
      { method: "POST", token, body: { slots: generated } },
    );
    const msg = result.skipped > 0
      ? `${result.created} slots added, ${result.skipped} skipped`
      : `${result.created} slots added`;
    setToastMessage(msg);
    await fetchSlots(profile.id);
  }

  return (
    <DashboardLayout role="doctor">
      <div className="animate-in fade-in duration-500 relative">
        {toastMessage && <ScheduleToast message={toastMessage} />}

        {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Schedule</h1>
            <p className="text-on-surface-variant font-sans">
              Manage your availability slots for patient bookings.
            </p>
          </div>
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
        ) : (
          <ScheduleCalendar
            slots={slots}
            patientNames={patientNames}
            token={token ?? ""}
            onSlotChange={handleSlotChange}
            onStatusChange={handleUpdateStatus}
            onDelete={handleDeleteSlot}
            recurringPanel={<WeeklyTemplateForm onGenerate={handleGenerateSlots} />}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
