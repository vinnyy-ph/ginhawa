"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import { DoctorAbout } from "@/components/doctors/doctor-about";
import { DoctorDetailSkeleton } from "@/components/doctors/doctor-detail-skeleton";
import { DoctorDetailError } from "@/components/doctors/doctor-detail-error";
import { DoctorDetailHero } from "@/components/doctors/doctor-detail-hero";
import { DoctorBookingCard } from "@/components/doctors/doctor-booking-card";
import { useDoctorDetail } from "@/hooks/use-doctor-detail";

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: session } = useSession();
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
