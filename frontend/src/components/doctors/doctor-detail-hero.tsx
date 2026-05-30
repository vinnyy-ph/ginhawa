/**
 * DoctorDetailHero — full-width gradient hero banner at the top of a doctor's profile page.
 *
 * Displays the doctor's avatar (photo or initials), PRC verified badge, name,
 * professional title, specialization, and location. Below the name a stats bar
 * surfaces key metrics (average rating, experience, fee per session, next
 * available slot) as a frosted-glass strip — items are omitted when data is absent
 * rather than showing empty placeholders.
 *
 * Used as the top section of /doctors/[id] above the two-column content area.
 */

import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon } from "@radix-ui/react-icons";
import type { DoctorProfile } from "@/types/api";
import { getEarliestAvailability, availabilityBadge } from "@/lib/availability";

export function DoctorDetailHero({ doctor }: { doctor: DoctorProfile }) {
  const initials = doctor.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avail = getEarliestAvailability(doctor.availabilitySlots);
  const availBadge = availabilityBadge(avail);

  // Build the stats bar conditionally — only include items whose underlying data
  // exists on the doctor profile to avoid placeholder noise.
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
  );
}
