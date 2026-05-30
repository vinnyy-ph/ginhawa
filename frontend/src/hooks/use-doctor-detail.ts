/**
 * Hook that fetches all data needed for a doctor's public detail page:
 * the doctor's profile, their upcoming available slots, and their reviews.
 * All three requests are made in parallel via Promise.all. Slots are
 * pre-filtered to AVAILABLE status and sorted chronologically so consumers
 * receive a ready-to-render list.
 */
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { DoctorProfile, AvailabilitySlot, DoctorReview } from "@/types/api";

/**
 * Fetches the profile, upcoming availability slots, and reviews for a single
 * doctor identified by `id`. Re-fetches whenever `id` changes.
 *
 * @param id - The doctor's UUID. Fetch is skipped when falsy.
 * @returns `doctor`, `slots` (future AVAILABLE only, ascending), `reviews`,
 *   `loading`, and `error`.
 */
export function useDoctorDetail(id: string) {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDoctorAndSlots() {
      try {
        setLoading(true);
        setError(null);
        const [doctorData, slotsData, reviewsData] = await Promise.all([
          apiRequest<DoctorProfile>(`/doctors/${id}`),
          apiRequest<AvailabilitySlot[]>(`/doctors/${id}/slots`),
          apiRequest<DoctorReview[]>(`/reviews/doctor/${id}`),
        ]);
        setDoctor(doctorData);
        const now = new Date();
        const availableSlots = slotsData
          .filter((s) => s.status === "AVAILABLE" && new Date(s.startTime) > now)
          .sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
        setSlots(availableSlots);
        setReviews(reviewsData);
      } catch {
        setError(
          "Failed to load doctor profile. They may not exist or are unavailable."
        );
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchDoctorAndSlots();
  }, [id]);

  return { doctor, slots, reviews, loading, error };
}
