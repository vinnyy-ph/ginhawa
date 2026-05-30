/**
 * DoctorAbout — main content column of the doctor detail page.
 *
 * Composed of four sections rendered in order:
 *   1. CredentialsCard (PRC license, location, languages) — trust signals first
 *   2. About — doctor's bio paragraphs
 *   3. Specializations & Focus Areas — primary/secondary specialization badges and parsed focus-area chips
 *   4. Patient Reviews — average star rating and review list
 *
 * Used alongside DoctorBookingCard in the two-column layout of /doctors/[id].
 */

import React from "react";
import type { DoctorProfile, DoctorReview } from "@/types/api";
import { StarRating } from "@/components/ui/star-rating";
import { StarFilledIcon } from "@radix-ui/react-icons";
import { formatRelativeTime } from "@/lib/datetime";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function CredentialsCard({ doctor }: { doctor: DoctorProfile }) {
  const hasAny =
    doctor.prcLicenseNo ||
    doctor.city ||
    doctor.region ||
    (doctor.languagesSpoken && doctor.languagesSpoken.length > 0);

  if (!hasAny) return null;

  return (
    <section>
      <h2 className="text-2xl font-bold text-text-primary mb-4">Credentials</h2>
      <div className="bg-primary/5 border border-primary/15 rounded-xl divide-y divide-primary/10">
        {doctor.prcLicenseNo && (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006b5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">PRC License</p>
              <p className="text-sm text-text-primary font-medium mt-0.5">
                {doctor.prcLicenseNo}
                {doctor.isVerified && (
                  <span className="ml-2 text-primary font-semibold">· Verified ✓</span>
                )}
              </p>
            </div>
          </div>
        )}
        {(doctor.city || doctor.region) && (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006b5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Location</p>
              <p className="text-sm text-text-primary font-medium mt-0.5">
                {[doctor.city, doctor.region].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
        )}
        {doctor.languagesSpoken && doctor.languagesSpoken.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006b5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Languages</p>
              <p className="text-sm text-text-primary font-medium mt-0.5">
                {doctor.languagesSpoken.join(", ")}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function DoctorAbout({
  doctor,
  reviews,
}: {
  doctor: DoctorProfile;
  reviews: DoctorReview[];
}) {
  const specializations = doctor.specializations ?? [];
  // consultationFocusAreas is stored as a comma-separated string; split into
  // individual chips for the read-only display.
  const focusAreas = doctor.consultationFocusAreas
    ? doctor.consultationFocusAreas.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const hasSpecsOrFocus = specializations.length > 0 || focusAreas.length > 0;

  return (
    <div className="space-y-10">
      {/* 1. Credentials (trust signal first) */}
      <CredentialsCard doctor={doctor} />

      {/* 2. About */}
      <section>
        <h2 className="text-2xl font-bold text-text-primary mb-4">About</h2>
        <div className="text-on-surface-variant leading-relaxed space-y-4">
          {doctor.bio ? (
            doctor.bio.split("\n").map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p className="italic">No biography information provided.</p>
          )}
        </div>
      </section>

      {/* 3. Specializations & Focus Areas (merged) */}
      {hasSpecsOrFocus && (
        <section>
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            Specializations &amp; Focus Areas
          </h2>
          {specializations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {specializations.map((s) => (
                <span
                  key={s.specialization.id}
                  className={
                    s.isPrimary
                      ? "bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm font-medium"
                      : "bg-surface-container px-3 py-1.5 rounded-md text-sm text-on-surface-variant"
                  }
                >
                  {s.specialization.name}
                  {s.isPrimary ? " · Primary" : ""}
                </span>
              ))}
            </div>
          )}
          {focusAreas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {focusAreas.map((area, i) => (
                <span
                  key={i}
                  className="bg-surface-container px-3 py-1.5 rounded-md text-sm text-on-surface-variant"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Patient Reviews */}
      <section>
        <h2 className="text-2xl font-bold text-text-primary mb-3">Patient Reviews</h2>
        <StarRating rating={doctor.avgRating ?? 0} count={doctor.reviewCount ?? 0} />
        {reviews.length > 0 ? (
          <ul className="mt-6 space-y-6">
            {reviews.map((r) => (
              <li key={r.id} className="flex gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full bg-surface-container flex items-center justify-center text-sm font-semibold text-on-surface-variant">
                  {initialsOf(r.patient.fullName)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-text-primary">{r.patient.fullName}</p>
                    <span className="text-xs text-on-surface-variant">
                      {formatRelativeTime(r.createdAt)}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-0.5 my-1"
                    aria-label={`Rated ${r.rating} out of 5`}
                  >
                    {[1, 2, 3, 4, 5].map((i) => (
                      <StarFilledIcon
                        key={i}
                        className={
                          i <= r.rating
                            ? "w-3.5 h-3.5 text-warning"
                            : "w-3.5 h-3.5 text-outline-variant"
                        }
                      />
                    ))}
                  </div>
                  {r.comment && (
                    <p className="text-sm text-on-surface-variant leading-relaxed">{r.comment}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-on-surface-variant italic">No written reviews yet.</p>
        )}
      </section>
    </div>
  );
}
