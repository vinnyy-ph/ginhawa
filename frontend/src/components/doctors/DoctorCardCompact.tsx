import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DoctorProfile, AvailabilitySlot } from "@/types/api";

interface DoctorCardCompactProps {
  doctor: DoctorProfile;
}

export function DoctorCardCompact({ doctor }: DoctorCardCompactProps) {
  const initials = doctor.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const focusAreas = doctor.consultationFocusAreas
    ? doctor.consultationFocusAreas.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const hasMeta =
    (doctor.yearsOfExperience !== undefined && doctor.yearsOfExperience !== null) ||
    (doctor.consultationFee !== undefined && doctor.consultationFee !== null);

  // Availability status (ported from DoctorCard)
  let availabilityStatus = "Fully Booked";
  let badgeColor =
    "bg-surface-container text-on-surface-variant border-outline-variant";

  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  if (doctor.availabilitySlots && doctor.availabilitySlots.length > 0) {
    const availableSlots = doctor.availabilitySlots.filter(
      (slot: AvailabilitySlot) =>
        slot.status === "AVAILABLE" && new Date(slot.startTime) > now
    );

    if (availableSlots.length > 0) {
      const hasToday = availableSlots.some(
        (slot) => new Date(slot.startTime) <= todayEnd
      );
      if (hasToday) {
        availabilityStatus = "Available Today";
        badgeColor = "bg-primary/10 text-primary border-primary/20";
      } else {
        availabilityStatus = "Available Soon";
        badgeColor =
          "bg-secondary-container/30 text-on-secondary-container border-secondary-container/50";
      }
    }
  }

  return (
    <div className="bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col h-full group">
      {/* Header: avatar + name + availability badge */}
      <div className="flex items-start gap-4">
        {doctor.profilePictureUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={doctor.profilePictureUrl}
            alt={`Profile photo of ${doctor.fullName}`}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-surface-container-low shrink-0"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center ring-2 ring-surface-container-low shrink-0"
            aria-label={`Avatar for ${doctor.fullName}`}
          >
            <span className="text-white font-bold text-lg font-serif">
              {initials}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-lg text-text-primary leading-tight font-serif tracking-tight truncate group-hover:text-primary transition-colors">
              {doctor.professionalTitle
                ? `${doctor.professionalTitle} ${doctor.fullName}`
                : doctor.fullName}
            </h3>
            <span
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full border whitespace-nowrap shrink-0",
                badgeColor
              )}
            >
              {availabilityStatus}
            </span>
          </div>
          <span className="text-primary font-semibold uppercase tracking-widest text-[11px] block mt-1 truncate">
            {doctor.specialization}
          </span>
        </div>
      </div>

      {/* Bio */}
      {doctor.bio && (
        <p className="mt-4 text-on-surface-variant text-sm leading-relaxed line-clamp-2">
          {doctor.bio}
        </p>
      )}

      {/* Focus areas */}
      {focusAreas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {focusAreas.slice(0, 2).map((area, idx) => (
            <span
              key={idx}
              className="bg-surface-container-lowest text-on-surface-variant text-xs px-2.5 py-1 rounded-md border border-outline-variant/40 font-medium"
            >
              {area}
            </span>
          ))}
          {focusAreas.length > 2 && (
            <span className="bg-surface-container-low text-on-surface-variant text-xs px-2.5 py-1 rounded-md font-medium">
              +{focusAreas.length - 2} more
            </span>
          )}
        </div>
      )}

      {/* Meta + action, pinned to bottom */}
      <div className="mt-auto">
        {hasMeta && (
        <div className="flex items-center gap-6 pt-4 border-t border-outline-variant/20 mb-4">
          {doctor.yearsOfExperience !== undefined &&
            doctor.yearsOfExperience !== null && (
              <div className="flex flex-col">
                <span className="text-on-surface-variant font-semibold uppercase tracking-wider text-[10px]">
                  Experience
                </span>
                <span className="text-text-primary font-bold mt-0.5 text-sm">
                  {doctor.yearsOfExperience}+ yrs
                </span>
              </div>
            )}

          {doctor.consultationFee !== undefined &&
            doctor.consultationFee !== null && (
              <div className="flex flex-col">
                <span className="text-on-surface-variant font-semibold uppercase tracking-wider text-[10px]">
                  Fee
                </span>
                <span className="text-primary font-bold mt-0.5 font-mono text-sm">
                  ₱{doctor.consultationFee.toLocaleString()}
                </span>
              </div>
            )}
        </div>
        )}

        <Link
          href={`/dashboard/find-doctors/${doctor.id}`}
          aria-label={`Book appointment with ${doctor.fullName}`}
        >
          <Button className="w-full rounded-2xl py-6 font-semibold bg-primary hover:bg-primary/90 text-white shadow-soft">
            Book Appointment
          </Button>
        </Link>
      </div>
    </div>
  );
}
