"use client";

/**
 * Route: /doctors/[id] — individual doctor profile page.
 *
 * Displays a doctor's full profile including bio, specialization, reviews, and
 * available appointment slots. The booking card is rendered for all visitors
 * but booking actions require authentication (non-doctor). Doctor accounts see
 * the profile in read-only mode. Data is fetched client-side via `useDoctorDetail`.
 */

import { use } from "react";
import { useSession } from "next-auth/react";
import { DoctorAbout } from "@/components/doctors/doctor-about";
import { DoctorDetailSkeleton } from "@/components/doctors/doctor-detail-skeleton";
import { DoctorDetailError } from "@/components/doctors/doctor-detail-error";
import { DoctorDetailHero } from "@/components/doctors/doctor-detail-hero";
import { DoctorBookingCard } from "@/components/doctors/doctor-booking-card";
import { useDoctorDetail } from "@/hooks/use-doctor-detail";

/**
 * Renders the doctor profile page for the given `id`. Suspends via `use(params)`
 * to unwrap the async route params; delegates loading/error UI to dedicated
 * skeleton and error components while `useDoctorDetail` resolves.
 */
export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: session } = useSession();
  // Doctors viewing another doctor's profile should not see booking controls.
  const isDoctor = session?.user?.role === "DOCTOR";
  const isAuthenticated = !!session;

  const { doctor, slots, reviews, loading, error } = useDoctorDetail(id);

  if (loading) return <DoctorDetailSkeleton />;
  if (error || !doctor) return <DoctorDetailError message={error} />;

  return (
    <div className="min-h-screen bg-surface pb-12">
      <DoctorDetailHero doctor={doctor} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <DoctorAbout doctor={doctor} reviews={reviews} />
          </div>

          <div className="lg:col-span-1 w-fit">
            <DoctorBookingCard
              isAuthenticated={isAuthenticated}
              isDoctor={isDoctor}
              slots={slots}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
