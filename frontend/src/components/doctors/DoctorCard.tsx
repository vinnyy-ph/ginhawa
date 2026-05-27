import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DoctorProfile, AvailabilitySlot } from "@/types/api";

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

  // Parse fields that might be comma-separated strings
  const focusAreas = doctor.consultationFocusAreas
    ? doctor.consultationFocusAreas.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const languages = doctor.languagesSpoken
    ? doctor.languagesSpoken.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Determine availability status
  let availabilityStatus = "Fully Booked";
  let badgeColor = "bg-surface-container text-on-surface-variant border-outline-variant";

  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  if (doctor.availabilitySlots && doctor.availabilitySlots.length > 0) {
    const availableSlots = doctor.availabilitySlots.filter(
      (slot: AvailabilitySlot) => slot.status === "AVAILABLE" && new Date(slot.startTime) > now
    );

    if (availableSlots.length > 0) {
      const hasToday = availableSlots.some(
        (slot) => new Date(slot.startTime) <= todayEnd
      );
      if (hasToday) {
        availabilityStatus = "Available Today";
        badgeColor = "bg-[#48cab6]/10 text-[#006b5e] border-[#48cab6]/30";
      } else {
        availabilityStatus = "Available Soon";
        badgeColor = "bg-primary/10 text-primary border-primary/20";
      }
    }
  }

  return (
    <div className="bg-surface-white rounded-2xl shadow-soft overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-lifted transition-all duration-300 border border-transparent hover:border-primary/20 group relative">
      <div className="h-2 bg-gradient-to-r from-[#006b5e] via-[#31a795] to-[#48cab6]" />
      
      {/* Availability Badge Absolute */}
      <div className="absolute top-5 right-5">
        <div className={cn("px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full border", badgeColor)}>
          {availabilityStatus}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex gap-4 items-start mb-4 pr-24">
          <div className="shrink-0">
            {doctor.profilePictureUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
            <img
                src={doctor.profilePictureUrl}
                alt={`Profile photo of ${doctor.fullName}`}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-[#48cab6] to-[#006b5e] flex items-center justify-center ring-2 ring-primary/10 shadow-inner"
                aria-label={`Avatar for ${doctor.fullName}`}
              >
                <span className="text-white font-bold text-xl">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-bold text-lg text-text-primary leading-tight group-hover:text-primary transition-colors truncate">
              {doctor.professionalTitle
                ? `${doctor.professionalTitle} ${doctor.fullName}`
                : doctor.fullName}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge
                variant="outline"
                className="text-[11px] border-[#31a795]/40 text-[#006b5e] bg-[#48cab6]/5 font-semibold px-2 py-0.5 rounded-md"
              >
                {doctor.specialization}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-surface-container/60 text-xs">
          {doctor.yearsOfExperience !== undefined && doctor.yearsOfExperience !== null && (
            <div className="flex flex-col">
              <span className="text-on-surface-variant font-medium uppercase tracking-wider text-[10px]">Experience</span>
              <span className="text-text-primary font-semibold mt-0.5">{doctor.yearsOfExperience}+ Years</span>
            </div>
          )}
          {doctor.consultationFee !== undefined && doctor.consultationFee !== null && (
            <div className="flex flex-col pl-4 border-l border-surface-container/60">
              <span className="text-on-surface-variant font-medium uppercase tracking-wider text-[10px]">Fee</span>
              <span className="text-[#006b5e] font-bold mt-0.5">₱{doctor.consultationFee.toLocaleString()}</span>
            </div>
          )}
          {languages.length > 0 && (
            <div className="flex flex-col pl-4 border-l border-surface-container/60 truncate">
              <span className="text-on-surface-variant font-medium uppercase tracking-wider text-[10px]">Speaks</span>
              <span className="text-text-primary font-medium mt-0.5 truncate max-w-[100px]" title={languages.join(", ")}>
                {languages.join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Focus Areas */}
        {focusAreas.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {focusAreas.slice(0, 2).map((area, idx) => (
                <span key={idx} className="bg-surface-container-low text-on-surface text-[11px] px-2 py-1 rounded-md border border-outline-variant/30 font-medium">
                  {area}
                </span>
              ))}
              {focusAreas.length > 2 && (
                <span className="bg-surface-container text-on-surface-variant text-[11px] px-2 py-1 rounded-md font-medium" title={focusAreas.slice(2).join(", ")}>
                  +{focusAreas.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bio */}
        {doctor.bio && (
          <div className="mb-5 flex-1">
            <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2">
              {doctor.bio}
            </p>
          </div>
        )}

        <div className={cn("mt-auto", !doctor.bio && "pt-2")}>
          <Link
            href={`/doctors/${doctor.id}`}
            className="block w-full"
            aria-label={`${isPatient ? "Book appointment with" : "View profile of"} ${doctor.fullName}`}
          >
            <Button 
              className={cn(
                "w-full rounded-xl py-5 font-semibold transition-all shadow-sm", 
                isPatient 
                  ? "bg-[#006b5e] hover:bg-[#005248] text-white" 
                  : "bg-surface-white border-[#31a795] text-[#006b5e] hover:bg-[#48cab6]/10"
              )} 
              variant={isPatient ? "default" : "outline"}
            >
              {isPatient ? "Book Appointment" : "View Profile"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
