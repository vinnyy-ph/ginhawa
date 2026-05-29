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

export function DoctorAbout({
  doctor,
  reviews,
}: {
  doctor: DoctorProfile;
  reviews: DoctorReview[];
}) {
  const specializations = doctor.specializations ?? [];
  return (
    <div className="space-y-10">
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

      {specializations.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-text-primary mb-3">
            Specializations
          </h3>
          <div className="flex flex-wrap gap-2">
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
        </section>
      )}

      {doctor.consultationFocusAreas && (
        <section>
          <h3 className="text-xl font-bold text-text-primary mb-3">Focus Areas</h3>
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

      {doctor.languagesSpoken && doctor.languagesSpoken.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-text-primary mb-3">Languages</h3>
          <p className="text-on-surface-variant">
            {doctor.languagesSpoken.join(", ")}
          </p>
        </section>
      )}

      {(doctor.prcLicenseNo || doctor.isVerified || doctor.city || doctor.region) && (
        <section>
          <h3 className="text-xl font-bold text-text-primary mb-3">
            Credentials &amp; Location
          </h3>
          <dl className="text-sm text-on-surface-variant space-y-1">
            {doctor.prcLicenseNo && (
              <div className="flex gap-2">
                <dt className="font-medium text-text-primary">PRC License No.</dt>
                <dd>
                  {doctor.prcLicenseNo}
                  {doctor.isVerified ? " (Verified)" : ""}
                </dd>
              </div>
            )}
            {(doctor.city || doctor.region) && (
              <div className="flex gap-2">
                <dt className="font-medium text-text-primary">Location</dt>
                <dd>{[doctor.city, doctor.region].filter(Boolean).join(", ")}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-bold text-text-primary mb-3">
          Patient Reviews
        </h2>
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
                    <p className="font-medium text-text-primary">
                      {r.patient.fullName}
                    </p>
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
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {r.comment}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-on-surface-variant italic">
            No written reviews yet.
          </p>
        )}
      </section>
    </div>
  );
}
