"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { SlotPicker } from "@/components/booking/slot-picker";
import type { DoctorProfile, AvailabilitySlot } from "@/types/api";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-gradient-to-br from-[#006b5e] via-[#31a795] to-[#48cab6] py-10">
        <div className="max-w-5xl mx-auto px-4 animate-pulse">
          <div className="h-4 bg-white/20 w-24 rounded mb-8" />
          <div className="flex gap-6 items-start">
            <div className="w-24 h-24 rounded-full bg-white/20 shrink-0" />
            <div className="space-y-4 flex-1">
              <div className="h-8 bg-white/20 rounded w-1/3" />
              <div className="h-4 bg-white/20 rounded w-1/4" />
              <div className="flex gap-2">
                <div className="h-6 bg-white/20 rounded-full w-20" />
                <div className="h-6 bg-white/20 rounded-full w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 bg-surface-container rounded w-32 mb-4" />
          <div className="h-4 bg-surface-container rounded w-full" />
          <div className="h-4 bg-surface-container rounded w-5/6" />
          <div className="h-4 bg-surface-container rounded w-4/5" />
        </div>
        <div className="lg:col-span-1">
          <div className="h-64 bg-surface-white rounded-xl shadow-soft" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: session } = useSession();
  const isDoctor = session?.user?.role === "DOCTOR";
  const isAuthenticated = !!session;

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [reason, setReason] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDoctorAndSlots() {
      try {
        setLoading(true);
        setError(null);
        const [doctorData, slotsData] = await Promise.all([
          apiRequest<DoctorProfile>(`/doctors/${id}`),
          apiRequest<AvailabilitySlot[]>(`/doctors/${id}/slots`),
        ]);
        setDoctor(doctorData);
        const now = new Date();
        const availableSlots = slotsData
          .filter(
            (s) => s.status === "AVAILABLE" && new Date(s.startTime) > now
          )
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
        setSlots(availableSlots);
      } catch (err: any) {
        setError(
          "Failed to load doctor profile. They may not exist or are unavailable."
        );
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDoctorAndSlots();
  }, [id]);

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !reason.trim() || reason.trim().length < 5) return;
    try {
      setIsBooking(true);
      setBookingError(null);
      await apiRequest("/appointments", {
        method: "POST",
        token: session?.user?.accessToken,
        body: { slotId: selectedSlot.id, reasonForVisit: reason.trim() },
      });
      setBookingSuccess(true);
      setTimeout(() => router.push("/dashboard/appointments"), 1500);
    } catch (err: any) {
      setBookingError(
        err.message || "Failed to book appointment. Please try again."
      );
    } finally {
      setIsBooking(false);
    }
  }

  if (loading) return <PageSkeleton />;

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="bg-gradient-to-br from-[#006b5e] via-[#31a795] to-[#48cab6] py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Doctors
            </Link>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="bg-surface-white rounded-xl shadow-soft p-8 text-center max-w-md">
            <ExclamationTriangleIcon className="w-12 h-12 text-error mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Profile Unavailable
            </h2>
            <p className="text-on-surface-variant mb-6">
              {error || "Doctor not found."}
            </p>
            <Button asChild>
              <Link href="/doctors">Return to Directory</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const initials = doctor.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-surface pb-12">
      {/* ── Success Toast ────────────────────────────────────────────────── */}
      {bookingSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-[#31a795] text-white px-6 py-3 rounded-xl shadow-lifted flex items-center gap-3">
            <CheckCircledIcon className="w-5 h-5" />
            <span className="font-medium">
              Appointment booked! Redirecting…
            </span>
          </div>
        </div>
      )}

      {/* ── Gradient Hero ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#006b5e] via-[#31a795] to-[#48cab6]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors mb-8"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Doctors
          </Link>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="shrink-0">
              {doctor.profilePictureUrl ? (
                <img
                  src={doctor.profilePictureUrl}
                  alt={`Profile of ${doctor.fullName}`}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white/30 shadow-soft"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">
                    {initials}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">
                {doctor.professionalTitle
                  ? `${doctor.professionalTitle} `
                  : ""}
                {doctor.fullName}
              </h1>
              <p className="text-white/75 text-base mb-4">
                {doctor.specialization}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 text-white text-sm px-3 py-1 rounded-full font-medium">
                  {doctor.specialization}
                </span>
                {doctor.yearsOfExperience && (
                  <span className="bg-white/20 text-white text-sm px-3 py-1 rounded-full">
                    {doctor.yearsOfExperience}+ yrs experience
                  </span>
                )}
                {doctor.consultationFee != null && (
                  <span className="bg-white/20 text-white text-sm px-3 py-1 rounded-full font-semibold">
                    ₱{doctor.consultationFee.toLocaleString()} / session
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: About + details */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                About
              </h2>
              <div className="text-on-surface-variant leading-relaxed space-y-4">
                {doctor.bio ? (
                  doctor.bio
                    .split("\n")
                    .map((p, i) => <p key={i}>{p}</p>)
                ) : (
                  <p className="italic">
                    No biography information provided.
                  </p>
                )}
              </div>
            </section>

            {doctor.consultationFocusAreas && (
              <section>
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Focus Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {doctor.consultationFocusAreas.split(",").map((area, i) => (
                    <span
                      key={i}
                      className="bg-surface-container px-3 py-1.5 rounded-md text-sm text-on-surface-variant"
                    >
                      {area.trim()}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {doctor.languagesSpoken && (
              <section>
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Languages
                </h3>
                <p className="text-on-surface-variant">
                  {doctor.languagesSpoken}
                </p>
              </section>
            )}
          </div>

          {/* Right: Booking panel */}
          <div className="lg:col-span-1">
            <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Book Appointment
                </h3>
              </div>

              <div className="p-6">
                {!isAuthenticated ? (
                  <div className="text-center py-4">
                    <p className="text-on-surface-variant text-sm mb-4">
                      Sign in to a patient account to book an appointment.
                    </p>
                    <Button className="w-full" asChild>
                      <Link href="/login">Sign In to Book</Link>
                    </Button>
                  </div>
                ) : isDoctor ? (
                  <div className="text-center py-4 bg-surface rounded-lg p-4">
                    <p className="text-on-surface-variant text-sm">
                      You are logged in as a doctor. Switch to a patient
                      account to book consultations.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <h4 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider">
                        Available Slots
                      </h4>
                      <SlotPicker
                        slots={slots}
                        selectedSlot={selectedSlot}
                        onSelectSlot={setSelectedSlot}
                      />
                    </div>

                    {selectedSlot && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <hr className="border-outline-variant/30 my-4" />
                        <form
                          onSubmit={handleBookAppointment}
                          className="space-y-4"
                        >
                          <div>
                            <label
                              htmlFor="reason"
                              className="block text-sm font-semibold text-text-primary mb-1"
                            >
                              Reason for Visit{" "}
                              <span className="text-error">*</span>
                            </label>
                            <textarea
                              id="reason"
                              required
                              minLength={5}
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Briefly describe your symptoms or concern…"
                              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-surface min-h-[80px]"
                            />
                          </div>
                          {bookingError && (
                            <p className="text-xs text-error">{bookingError}</p>
                          )}
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={isBooking || reason.trim().length < 5}
                          >
                            {isBooking ? "Confirming…" : "Confirm Booking"}
                          </Button>
                        </form>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
