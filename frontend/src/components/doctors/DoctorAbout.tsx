import React from "react";
import type { DoctorProfile } from "@/types/api";

export function DoctorAbout({ doctor }: { doctor: DoctorProfile }) {
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
    </div>
  );
}
