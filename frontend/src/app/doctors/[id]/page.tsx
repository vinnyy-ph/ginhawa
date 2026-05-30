"use client";

import React, { use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { DoctorAbout } from "@/components/doctors/DoctorAbout";
import { DoctorBookingPanel } from "@/components/booking/doctor-booking-panel";
import { useDoctorDetail } from "@/components/doctors/use-doctor-detail";
import { getEarliestAvailability, availabilityBadge } from "@/lib/availability";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-gradient-to-br from-[#004d43] via-brand to-brand-light py-10">
        <div className="max-w-5xl mx-auto px-4 animate-pulse">
          <div className="h-4 bg-white/20 w-24 rounded mb-8" />
          <div className="flex gap-6 items-start">
            <div className="w-24 h-24 rounded-full bg-white/20 shrink-0" />
            <div className="space-y-4 flex-1">
              <div className="h-8 bg-white/20 rounded w-1/3" />
              <div className="h-4 bg-white/20 rounded w-1/4" />
              <div className="h-20 bg-white/10 rounded-2xl mt-4" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 bg-surface-container rounded w-32 mb-4" />
          <div className="h-4 bg-surface-container rounded w-full" />
          <div className="h-4 bg-surface-container rounded w-5/6" />
        </div>
        <div className="lg:col-span-1">
          <div className="h-64 bg-surface-white rounded-xl shadow-soft" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data: session } = useSession();
  const isDoctor = session?.user?.role === "DOCTOR";
  const isAuthenticated = !!session;

  const { doctor, slots, reviews, loading, error } = useDoctorDetail(id);

  if (loading) return <PageSkeleton />;

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="bg-gradient-to-br from-[#004d43] via-brand to-brand-light py-10">
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
            <h2 className="text-xl font-bold text-text-primary mb-2">Profile Unavailable</h2>
            <p className="text-on-surface-variant mb-6">{error || "Doctor not found."}</p>
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

  const avail = getEarliestAvailability(doctor.availabilitySlots);
  const availBadge = availabilityBadge(avail);

  // Stats bar items — only rendered when data is present
  const statsItems: { label: string; value: string; sub?: string }[] = [];
  if (doctor.avgRating) {
    statsItems.push({
      label: "Rating",
      value: `★ ${doctor.avgRating.toFixed(1)}`,
      sub: `${doctor.reviewCount ?? 0} reviews`,
    });
  }
  if (doctor.yearsOfExperience != null) {
    statsItems.push({ label: "Experience", value: `${doctor.yearsOfExperience}+ yrs` });
  }
  if (doctor.consultationFee != null) {
    statsItems.push({
      label: "Fee / session",
      value: `₱${doctor.consultationFee.toLocaleString()}`,
    });
  }
  if (avail.kind !== "booked") {
    statsItems.push({
      label: "Next available",
      value: availBadge.text,
    });
  }

  const locationLine = [doctor.city, doctor.region].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-surface pb-12">
      {/* ── Gradient Hero ───────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#004d43] via-brand to-brand-light">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors mb-8"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Doctors
          </Link>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar with verified badge */}
            <div className="shrink-0 relative">
              {doctor.profilePictureUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={doctor.profilePictureUrl}
                  alt={`Profile of ${doctor.fullName}`}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white/30 shadow-soft"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">{initials}</span>
                </div>
              )}
              {doctor.isVerified && (
                <div
                  className="absolute bottom-0 right-0 z-10 w-8 h-8 bg-primary-container rounded-full border-3 border-white flex items-center justify-center shadow-sm"
                  title="PRC Verified"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="3,8 6.5,12 13,4" />
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Tier 1: Name + verified chip */}
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight flex flex-wrap items-center gap-3">
                {doctor.professionalTitle ? `${doctor.professionalTitle} ` : ""}
                {doctor.fullName}
                {doctor.isVerified && (
                  <span className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3,8 6.5,12 13,4" />
                    </svg>
                    PRC Verified
                  </span>
                )}
              </h1>

              {/* Tier 2: Specialization + location */}
              <p className="mt-1.5 text-white/85 text-base font-medium">
                {doctor.specialization}
                {locationLine ? ` · ${locationLine}` : ""}
              </p>

              {/* Tier 3: Stats bar */}
              {statsItems.length > 0 && (
                <div className="mt-5 flex flex-wrap bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
                  {statsItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col px-5 py-3 flex-1 min-w-[80px] border-r border-white/15 last:border-r-0"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                        {item.label}
                      </span>
                      <span className="text-lg font-bold text-white mt-0.5 flex items-center gap-1">
                        {item.label === "Next available" && (
                          <CalendarIcon className="w-4 h-4 opacity-70" aria-hidden="true" />
                        )}
                        {item.value}
                      </span>
                      {item.sub && (
                        <span className="text-[11px] text-white/65 mt-0.5">{item.sub}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <DoctorAbout doctor={doctor} reviews={reviews} />
          </div>

          <div className="lg:col-span-1 w-fit">
            <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-brand-light/10 to-brand/10 px-6 py-4 border-b border-outline-variant/30">
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
                      You are logged in as a doctor. Switch to a patient account to book consultations.
                    </p>
                  </div>
                ) : (
                  <DoctorBookingPanel slots={slots} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
