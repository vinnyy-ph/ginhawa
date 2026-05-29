"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest, ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/ui/date-picker";
import { TimeField } from "@/components/ui/time-field";
import { localTodayISO } from "@/lib/schemas/onboarding.schemas";
import { ClockIcon, PlusIcon, TrashIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { Chip } from "@/components/ui/chip";
import { formatPHTime, formatPHDate } from '@/lib/datetime';
import { generateSlots, type WeeklyTemplate } from "@/lib/generate-slots";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot, DoctorProfile, SlotStatus } from "@/types/api";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_BULK_SLOTS = 1000;

export default function DoctorSchedulePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const router = useRouter();

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showTemplate, setShowTemplate] = useState(false);
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
        // 1. Get profile to get doctor's UUID
        const profileData = await apiRequest<DoctorProfile>("/doctors/profile", { token });
        setProfile(profileData);
        
        // 2. Fetch slots using doctor's UUID
        if (profileData && profileData.id) {
          await fetchSlots(profileData.id);
        }
      } catch (err) {
        console.error(err);
        if (err instanceof ApiError && err.status === 404) {
          router.replace('/onboarding/doctor');
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

  async function fetchSlots(doctorId: string) {
    const data = await apiRequest<AvailabilitySlot[]>(`/doctors/${doctorId}/slots`);
    // Sort chronologically
    data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    setSlots(data);
  }

  // Handle Toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !profile || !formDate || !formStartTime || !formEndTime) return;
    
    // Validate times
    const startObj = new Date(`${formDate}T${formStartTime}:00`);
    const endObj = new Date(`${formDate}T${formEndTime}:00`);
    
    if (endObj <= startObj) {
      setFormError("End time must be after start time");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setFormError(null);
      
      const startIso = startObj.toISOString();
      const endIso = endObj.toISOString();
      
      await apiRequest("/doctors/slots", {
        method: "POST",
        token,
        body: {
          startTime: startIso,
          endTime: endIso
        }
      });
      
      setToastMessage("Slot added successfully");
      setShowAddForm(false);
      // Reset form somewhat but keep date
      setFormStartTime("09:00");
      setFormEndTime("10:00");
      
      // Refresh slots
      await fetchSlots(profile.id);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add slot";
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateStatus(id: string, status: SlotStatus) {
    if (!token || !profile) return;
    try {
      setUpdatingId(id);
      // Optimistic
      setSlots(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      
      await apiRequest(`/doctors/slots/${id}`, {
        method: "PATCH",
        token,
        body: { status }
      });
      
      setToastMessage(`Slot marked as ${status.toLowerCase()}`);
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to update slot. Changes reverted.");
      await fetchSlots(profile.id);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteSlot(id: string) {
    if (!token || !profile) return;
    try {
      setUpdatingId(id);
      
      await apiRequest(`/doctors/slots/${id}`, {
        method: "DELETE",
        token
      });
      
      // Optimistic delete
      setSlots(prev => prev.filter(s => s.id !== id));
      setToastMessage("Slot deleted");
      setConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to delete slot. Please try again.");
      await fetchSlots(profile.id);
    } finally {
      setUpdatingId(null);
    }
  }

  const template: WeeklyTemplate = useMemo(
    () => ({
      weekdays: tplWeekdays,
      startDate: tplStartDate,
      weeks: tplWeeks,
      dayStart: tplDayStart,
      dayEnd: tplDayEnd,
      slotMinutes: tplSlotMinutes,
      breakWindow: tplBreakOn
        ? { start: tplBreakStart, end: tplBreakEnd }
        : null,
    }),
    [tplWeekdays, tplStartDate, tplWeeks, tplDayStart, tplDayEnd, tplSlotMinutes, tplBreakOn, tplBreakStart, tplBreakEnd],
  );

  const previewSlots = useMemo(
    () => (tplStartDate ? generateSlots(template) : []),
    // tplStartDate is captured inside template
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template],
  );

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !profile) return;
    setTplError(null);

    if (tplDayEnd <= tplDayStart) {
      setTplError("Day end time must be after start time");
      return;
    }
    if (tplBreakOn && tplBreakEnd <= tplBreakStart) {
      setTplError("Break end time must be after break start time");
      return;
    }
    if (previewSlots.length === 0) {
      setTplError("This template generates no slots. Check your inputs.");
      return;
    }
    if (previewSlots.length > MAX_BULK_SLOTS) {
      setTplError(`Too many slots (${previewSlots.length}). Max ${MAX_BULK_SLOTS} per batch — reduce the weeks, days, or use a longer slot length.`);
      return;
    }

    try {
      setTplSubmitting(true);
      const result = await apiRequest<{ created: number; skipped: number }>(
        "/doctors/slots/bulk",
        { method: "POST", token, body: { slots: previewSlots } },
      );
      const msg =
        result.skipped > 0
          ? `${result.created} slots added, ${result.skipped} skipped`
          : `${result.created} slots added`;
      setToastMessage(msg);
      setShowTemplate(false);
      await fetchSlots(profile.id);
    } catch (err) {
      setTplError(err instanceof Error ? err.message : "Failed to generate slots");
    } finally {
      setTplSubmitting(false);
    }
  }

  function toggleWeekday(d: number) {
    setTplWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  // Group slots by date string
  const slotsByDate = useMemo(() => {
    const groups: Record<string, AvailabilitySlot[]> = {};
    slots.forEach(slot => {
      const dateStr = formatPHDate(slot.startTime, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(slot);
    });
    return groups;
  }, [slots]);

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
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Schedule</h1>
            <p className="text-on-surface-variant font-sans">
              Manage your availability slots for patient bookings.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTemplate(!showTemplate)}
              className="shrink-0 gap-2"
            >
              {showTemplate ? "Cancel" : <><ClockIcon className="w-4 h-4" /> Set weekly schedule</>}
            </Button>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="shrink-0 gap-2">
              {showAddForm ? "Cancel" : <><PlusIcon className="w-4 h-4" /> Add Availability Slot</>}
            </Button>
          </div>
        </div>

        {/* Add Slot Form */}
        {showAddForm && (
          <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-gradient-to-r from-brand-light/10 to-brand/10 px-6 py-4 border-b border-outline-variant/30 flex items-center gap-2">
              <PlusIcon className="w-5 h-5 text-primary" />
              <h3 className="font-serif text-lg font-bold text-text-primary">Create New Slot</h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddSlot} className="flex flex-col md:flex-row gap-6 items-end">
                <div className="w-full md:w-auto flex-1">
                  <label className="block text-sm font-semibold text-text-primary mb-1">Date</label>
                  <DatePicker
                    value={formDate}
                    onChange={setFormDate}
                    minDate={localTodayISO()}
                  />
                </div>
                
                <div className="w-full md:w-auto flex-1">
                  <label className="block text-sm font-semibold text-text-primary mb-1">Start Time</label>
                  <TimeField value={formStartTime} onChange={setFormStartTime} aria-label="Start time" />
                </div>
                
                <div className="w-full md:w-auto flex-1">
                  <label className="block text-sm font-semibold text-text-primary mb-1">End Time</label>
                  <TimeField value={formEndTime} onChange={setFormEndTime} aria-label="End time" />
                </div>
                
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto min-w-[120px]">
                  {isSubmitting ? "Saving..." : "Add Slot"}
                </Button>
              </form>
              
              {formError && (
                <p className="text-error text-sm mt-4">{formError}</p>
              )}
            </div>
          </div>
        )}

        {/* Weekly Template Panel */}
        {showTemplate && (
          <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-gradient-to-r from-brand-light/10 to-brand/10 px-6 py-4 border-b border-outline-variant/30 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-primary" />
              <h3 className="font-serif text-lg font-bold text-text-primary">Set Weekly Schedule</h3>
            </div>
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
                  {tplStartDate ? <>Up to <span className="font-semibold text-text-primary">{previewSlots.length}</span> slots will be created.</> : "Pick a start date to preview."}
                </p>
                <Button type="submit" disabled={tplSubmitting || previewSlots.length === 0 || previewSlots.length > MAX_BULK_SLOTS} className="min-w-[140px]">
                  {tplSubmitting ? "Generating..." : "Generate slots"}
                </Button>
              </div>

              {tplError && <p className="text-error text-sm">{tplError}</p>}
            </form>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-error p-6 rounded-lg border border-red-100 text-center">
            {error}
          </div>
        ) : slots.length === 0 ? (
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center border border-outline-variant/30 max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-surface-container mx-auto mb-6 flex items-center justify-center">
              <ClockIcon className="w-10 h-10 text-on-surface-variant/50" />
            </div>
            <h3 className="font-bold font-serif text-2xl text-text-primary mb-3">Your schedule is empty</h3>
            <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
              Add availability slots to let patients know when they can book appointments with you.
            </p>
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <PlusIcon className="w-4 h-4" /> Add your first slot
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(slotsByDate).map(([date, daySlots]) => (
              <div key={date}>
                <h3 className="text-lg font-bold font-serif text-text-primary mb-4 pb-2 border-b border-outline-variant/50 sticky top-0 bg-surface z-10 pt-2">
                  {date}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {daySlots.map(slot => {
                    const timeStr = `${formatPHTime(slot.startTime)} – ${formatPHTime(slot.endTime)}`;
                    const isBooked = slot.status === "BOOKED";
                    const isAvailable = slot.status === "AVAILABLE";
                    const isBlocked = slot.status === "BLOCKED";
                    const isUpdating = updatingId === slot.id;
                    const isConfirmingDelete = confirmDeleteId === slot.id;
                    
                    return (
                      <div 
                        key={slot.id} 
                        className={cn(
                          "bg-surface-white rounded-lg shadow-sm border p-4 flex flex-col justify-between transition-all relative overflow-hidden",
                          isBooked ? "border-info/30 bg-info/5" : 
                          isBlocked ? "border-outline-variant/50 opacity-75" : 
                          "border-primary/20 hover:border-primary/50 hover:shadow-soft",
                          isUpdating && "opacity-50 pointer-events-none"
                        )}
                      >
                        {isBooked && (
                          <div className="absolute top-0 left-0 w-1 h-full bg-info" />
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                          <div className="font-mono text-sm font-semibold text-text-primary">
                            {timeStr}
                          </div>
                          <Badge variant={
                            isBooked ? "info" : 
                            isAvailable ? "success" : 
                            "secondary"
                          }>
                            {slot.status}
                          </Badge>
                        </div>
                        
                        <div className="mt-auto pt-4 border-t border-outline-variant/30 flex justify-between items-center h-10">
                          {isBooked ? (
                            <p className="text-xs text-on-surface-variant italic w-full text-center">
                              Cannot edit booked slot
                            </p>
                          ) : isConfirmingDelete ? (
                            <div className="flex w-full items-center justify-between gap-2 text-xs font-semibold">
                              <span className="text-error">Delete this slot?</span>
                              <div className="flex gap-1">
                                <button onClick={() => handleDeleteSlot(slot.id)} className="px-2 py-1 bg-error text-white rounded shadow-sm hover:bg-error/90">Yes</button>
                                <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 bg-surface-container text-on-surface-variant rounded hover:bg-surface-variant">No</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleUpdateStatus(slot.id, isAvailable ? "BLOCKED" : "AVAILABLE")}
                                className="text-xs font-semibold text-primary hover:underline"
                              >
                                {isAvailable ? "Block slot" : "Unblock slot"}
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(slot.id)}
                                className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded hover:bg-error/10"
                                aria-label="Delete slot"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
