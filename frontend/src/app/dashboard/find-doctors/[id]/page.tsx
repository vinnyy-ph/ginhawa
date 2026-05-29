"use client";

import React, { use } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DoctorAbout } from "@/components/doctors/DoctorAbout";
import { DoctorBookingPanel } from "@/components/booking/doctor-booking-panel";
import { useDoctorDetail } from "@/components/doctors/use-doctor-detail";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-32 bg-surface-container rounded mb-6" />
      <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 flex items-start gap-5 mb-8">
        <div className="w-24 h-24 rounded-full bg-surface-container shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-7 bg-surface-container rounded w-1/2" />
          <div className="h-4 bg-surface-container rounded w-1/3" />
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-surface-container rounded-full" />
            <div className="h-6 w-24 bg-surface-container rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 bg-surface-container rounded w-32" />
          <div className="h-4 bg-surface-container rounded w-full" />
          <div className="h-4 bg-surface-container rounded w-5/6" />
        </div>
        <div className="lg:col-span-1">
          <div className="h-64 bg-surface-white rounded-3xl border border-outline-variant/30" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardDoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { doctor, slots, loading, error } = useDoctorDetail(id);

  return (
    <DashboardLayout role="patient">
      <Link
        href="/dashboard/find-doctors"
        className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Find Doctors
      </Link>

      {loading ? (
        <PageSkeleton />
      ) : error || !doctor ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm p-8 max-w-md">
            <ExclamationTriangleIcon className="w-12 h-12 text-error mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Profile Unavailable
            </h2>
            <p className="text-on-surface-variant mb-6">
              {error || "Doctor not found."}
            </p>
            <Button asChild>
              <Link href="/dashboard/find-doctors">Back to Find Doctors</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Header card */}
          <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 flex flex-col sm:flex-row items-start gap-5 mb-8">
            {doctor.profilePictureUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={doctor.profilePictureUrl}
                alt={`Profile of ${doctor.fullName}`}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-surface-container-low shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center ring-4 ring-surface-container-low shrink-0">
                <span className="text-white font-bold text-3xl font-serif">
                  {doctor.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary font-serif tracking-tight">
                {doctor.professionalTitle ? `${doctor.professionalTitle} ` : ""}
                {doctor.fullName}
              </h1>
              <p className="text-primary font-semibold uppercase tracking-widest text-xs mt-1">
                {doctor.specialization}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {doctor.yearsOfExperience != null && (
                  <span className="bg-surface-container text-on-surface-variant text-sm px-3 py-1 rounded-full">
                    {doctor.yearsOfExperience}+ yrs experience
                  </span>
                )}
                {doctor.consultationFee != null && (
                  <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-semibold">
                    ₱{doctor.consultationFee.toLocaleString()} / session
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <DoctorAbout doctor={doctor} />
            </div>

            <div className="lg:col-span-1">
              <div className="bg-surface-white rounded-3xl shadow-sm border border-outline-variant/30 overflow-hidden sticky top-24">
                <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30">
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    Book Appointment
                  </h3>
                </div>
                <div className="p-6">
                  <DoctorBookingPanel slots={slots} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
