"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/ui/date-picker";
import { TimeField } from "@/components/ui/time-field";
import { localTodayISO } from "@/lib/schemas/onboarding.schemas";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { Chip } from "@/components/ui/chip";
import { generateSlots, type WeeklyTemplate } from "@/lib/generate-slots";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import type { AvailabilitySlot, DoctorProfile, SlotStatus, Appointment } from "@/types/api";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_BULK_SLOTS = 1000;

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

  // Weekly template state
  const [tplWeekdays, setTplWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [tplStartDate, setTplStartDate] = useState("");
  const [tplWeeks, setTplWeeks] = useState(4);
  const [tplDayStart, setTplDayStart] = useState("09:00");
  const [tplDayEnd, setTplDayEnd] = useState("17:00");
  const [tplSlotMinutes, setTplSlotMinutes] = useState(60);
  const [tplBreakOn, setTplBreakOn] = useState(false);
  const [tplBreakStart, setTplBreakStart] = useState("12:00");
  const [tplBreakEnd, setTplBreakEnd] = useState("13:00");
  const [tplSubmitting, setTplSubmitting] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);

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
    } finally {
      // Reset state if needed
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

  const template: WeeklyTemplate = useMemo(
    () => ({
      weekdays: tplWeekdays,
      startDate: tplStartDate,
      weeks: tplWeeks,
      dayStart: tplDayStart,
      dayEnd: tplDayEnd,
      slotMinutes: tplSlotMinutes,
      breakWindow: tplBreakOn ? { start: tplBreakStart, end: tplBreakEnd } : null,
    }),
    [tplWeekdays, tplStartDate, tplWeeks, tplDayStart, tplDayEnd, tplSlotMinutes, tplBreakOn, tplBreakStart, tplBreakEnd],
  );

  const previewSlots = useMemo(
    () => (tplStartDate ? generateSlots(template) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template],
  );

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !profile) return;
    setTplError(null);
    if (tplDayEnd <= tplDayStart) { setTplError("Day end time must be after start time"); return; }
    if (tplBreakOn && tplBreakEnd <= tplBreakStart) { setTplError("Break end time must be after break start time"); return; }
    if (previewSlots.length === 0) { setTplError("This template generates no slots. Check your inputs."); return; }
    if (previewSlots.length > MAX_BULK_SLOTS) { setTplError(`Too many slots (${previewSlots.length}). Max ${MAX_BULK_SLOTS}.`); return; }
    try {
      setTplSubmitting(true);
      const result = await apiRequest<{ created: number; skipped: number }>(
        "/doctors/slots/bulk",
        { method: "POST", token, body: { slots: previewSlots } },
      );
      const msg = result.skipped > 0
        ? `${result.created} slots added, ${result.skipped} skipped`
        : `${result.created} slots added`;
      setToastMessage(msg);
      await fetchSlots(profile.id);
    } catch (err) {
      setTplError(err instanceof Error ? err.message : "Failed to generate slots");
    } finally {
      setTplSubmitting(false);
    }
  }

  function toggleWeekday(d: number) {
    setTplWeekdays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  // The weekly template form is passed as a render prop so ScheduleCalendar can
  // show/hide it without owning any of the template state.
  const recurringPanel = (
    <form onSubmit={handleGenerate} className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-2">Days of week</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, d) => (
            <Chip key={d} selected={tplWeekdays.includes(d)} onClick={() => toggleWeekday(d)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Day start</label>
          <TimeField value={tplDayStart} onChange={setTplDayStart} aria-label="Day start time" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Day end</label>
          <TimeField value={tplDayEnd} onChange={setTplDayEnd} aria-label="Day end time" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Slot length</label>
          <select
            value={tplSlotMinutes}
            onChange={(e) => setTplSlotMinutes(Number(e.target.value))}
            className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-white text-text-primary"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Repeat for (weeks)</label>
          <input
            type="number"
            min={1}
            max={12}
            value={tplWeeks}
            onChange={(e) => setTplWeeks(Math.min(12, Math.max(1, Number(e.target.value))))}
            className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-white text-text-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">Start date</label>
        <DatePicker value={tplStartDate} onChange={setTplStartDate} minDate={localTodayISO()} />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2">
          <input type="checkbox" checked={tplBreakOn} onChange={(e) => setTplBreakOn(e.target.checked)} />
          Add a daily break (skipped)
        </label>
        {tplBreakOn && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Break start</label>
              <TimeField value={tplBreakStart} onChange={setTplBreakStart} aria-label="Break start time" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Break end</label>
              <TimeField value={tplBreakEnd} onChange={setTplBreakEnd} aria-label="Break end time" />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-outline-variant/30">
        <p className="text-sm text-on-surface-variant">
          {tplStartDate
            ? <><span className="font-semibold text-text-primary">{previewSlots.length}</span> slots will be created.</>
            : "Pick a start date to preview."}
        </p>
        <Button
          type="submit"
          disabled={tplSubmitting || previewSlots.length === 0 || previewSlots.length > MAX_BULK_SLOTS}
          className="min-w-[140px]"
        >
          {tplSubmitting ? "Generating..." : "Generate slots"}
        </Button>
      </div>
      {tplError && <p className="text-error text-sm">{tplError}</p>}
    </form>
  );

  return (
    <DashboardLayout role="doctor">
      <div className="animate-in fade-in duration-500 relative">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-success text-white px-6 py-3 rounded-lg shadow-lifted flex items-center gap-3">
              <CheckCircledIcon className="w-5 h-5" />
              <span className="font-medium">{toastMessage}</span>
            </div>
          </div>
        )}

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
            recurringPanel={recurringPanel}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
