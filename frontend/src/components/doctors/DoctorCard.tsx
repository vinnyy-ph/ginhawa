import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { DoctorProfile } from "@/types/api";
import { StarRating } from "@/components/ui/star-rating";
import { getEarliestAvailability, availabilityBadge } from "@/lib/availability";

interface DoctorCardProps {
  doctor: DoctorProfile;
  isPatient: boolean;
}

export function DoctorCard({ doctor, isPatient }: DoctorCardProps) {
  const initials = doctor.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const focusAreas = doctor.consultationFocusAreas
    ? doctor.consultationFocusAreas.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const languages = doctor.languagesSpoken ?? [];

  const avail = getEarliestAvailability(doctor.availabilitySlots);
  const badge = availabilityBadge(avail);

  return (
    <div className="bg-surface-white rounded-3xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition-all duration-300 group">

      {/* Left: Image / Avatar */}
      <div className="p-6 sm:pr-0 shrink-0 flex flex-col items-center sm:items-start">
        <div className="relative">
          {doctor.profilePictureUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={doctor.profilePictureUrl}
              alt={`Profile photo of ${doctor.fullName}`}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-surface-container-low"
            />
          ) : (
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center ring-4 ring-surface-container-low shadow-inner"
              aria-label={`Avatar for ${doctor.fullName}`}
            >
              <span className="text-white font-bold text-3xl font-serif">{initials}</span>
            </div>
          )}
          {doctor.isVerified && (
            <div
              className="absolute bottom-0 right-0 z-10 w-7 h-7 bg-primary rounded-full border-2 border-white flex items-center justify-center shadow-sm"
              title="PRC Verified"
            >
              <svg
                width="12"
                height="12"
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
      </div>

      {/* Right: Content */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-2xl text-text-primary leading-tight font-serif tracking-tight group-hover:text-primary transition-colors flex items-center flex-wrap gap-2">
              {doctor.professionalTitle
                ? `${doctor.professionalTitle} ${doctor.fullName}`
                : doctor.fullName}
              {doctor.isVerified && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[11px] font-bold px-2.5 py-0.5">
                  <svg
                    width="9"
                    height="9"
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
                  Verified
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-primary font-semibold uppercase tracking-widest text-[11px]">
                {doctor.specialization}
              </span>
            </div>
            <div className="mt-2">
              <StarRating rating={doctor.avgRating ?? 0} count={doctor.reviewCount ?? 0} />
            </div>
          </div>

          <div
            className={cn(
              "px-3 py-1.5 text-xs font-bold tracking-wide uppercase rounded-full border whitespace-nowrap flex items-center gap-1.5",
              badge.colorClass
            )}
          >
            {badge.showCalendarIcon && (
              <CalendarIcon className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {badge.text}
          </div>
        </div>

        {/* Bio */}
        {doctor.bio && (
          <p className="mt-4 text-on-surface-variant text-base leading-relaxed line-clamp-2 md:line-clamp-3">
            {doctor.bio}
          </p>
        )}

        {/* Focus Areas */}
        {focusAreas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {focusAreas.slice(0, 3).map((area, idx) => (
              <span
                key={idx}
                className="bg-surface-container-lowest text-on-surface-variant text-xs px-2.5 py-1 rounded-md border border-outline-variant/40 font-medium"
              >
                {area}
              </span>
            ))}
            {focusAreas.length > 3 && (
              <span className="bg-surface-container-low text-on-surface-variant text-xs px-2.5 py-1 rounded-md font-medium">
                +{focusAreas.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Bottom Meta & Action */}
        <div
          className={cn(
            "mt-6 pt-5 border-t border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5",
            !doctor.bio && !focusAreas.length && "mt-auto"
          )}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            {doctor.yearsOfExperience != null && (
              <div className="flex flex-col">
                <span className="text-on-surface-variant font-semibold uppercase tracking-wider text-[10px]">Experience</span>
                <span className="text-text-primary font-bold mt-0.5">{doctor.yearsOfExperience}+ Years</span>
              </div>
            )}
            {doctor.consultationFee != null && (
              <div className="flex flex-col">
                <span className="text-on-surface-variant font-semibold uppercase tracking-wider text-[10px]">Consultation Fee</span>
                <span className="text-primary font-bold mt-0.5 font-mono">₱{doctor.consultationFee.toLocaleString()}</span>
              </div>
            )}
            {languages.length > 0 && (
              <div className="flex flex-col max-w-[120px] sm:max-w-none">
                <span className="text-on-surface-variant font-semibold uppercase tracking-wider text-[10px]">Languages</span>
                <span className="text-text-primary font-medium mt-0.5 truncate" title={languages.join(", ")}>
                  {languages.join(", ")}
                </span>
              </div>
            )}
          </div>

          <Link
            href={`/doctors/${doctor.id}`}
            className="w-full sm:w-auto shrink-0"
            aria-label={`${isPatient ? "Book appointment with" : "View profile of"} ${doctor.fullName}`}
          >
            <Button
              className={cn(
                "w-full rounded-2xl py-6 px-8 font-semibold transition-all shadow-soft",
                isPatient
                  ? "bg-primary hover:bg-primary/90 text-white"
                  : "bg-surface-white border-primary/50 text-primary hover:bg-primary/5"
              )}
              variant={isPatient ? "default" : "outline"}
            >
              {isPatient ? "Book Appointment" : "View Full Profile"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
