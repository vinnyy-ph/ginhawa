"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiRequest, ApiError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CalendarIcon, InfoCircledIcon, CheckCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { SlotPicker } from "@/components/booking/slot-picker";
import type { DoctorProfile, AvailabilitySlot } from "@/types/api";

// ─── Skeletons ─────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-surface-white border-b border-outline-variant py-8">
        <div className="max-w-4xl mx-auto px-4 animate-pulse">
          <div className="h-4 bg-surface-container w-24 rounded mb-8" />
          <div className="flex gap-6 items-start">
            <div className="w-24 h-24 rounded-full bg-surface-container shrink-0" />
            <div className="space-y-4 flex-1">
              <div className="h-8 bg-surface-container rounded w-1/3" />
              <div className="h-4 bg-surface-container rounded w-1/4" />
              <div className="flex gap-2">
                <div className="h-6 bg-surface-container rounded w-20" />
                <div className="h-6 bg-surface-container rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8 animate-pulse">
        <div className="md:col-span-2 space-y-4">
          <div className="h-6 bg-surface-container rounded w-32 mb-4" />
          <div className="h-4 bg-surface-container rounded w-full" />
          <div className="h-4 bg-surface-container rounded w-5/6" />
          <div className="h-4 bg-surface-container rounded w-4/5" />
        </div>
        <div className="md:col-span-1 space-y-4">
          <div className="h-64 bg-surface-white rounded-lg shadow-soft" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { data: session } = useSession();
  const isPatient = session?.user?.role === "PATIENT";
  const isDoctor = session?.user?.role === "DOCTOR";
  const isAuthenticated = !!session;

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [reason, setReason] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDoctorAndSlots() {
      try {
        setLoading(true);
        setError(null);
        
        const [doctorData, slotsData] = await Promise.all([
          apiRequest<DoctorProfile>(`/doctors/${id}`),
          apiRequest<AvailabilitySlot[]>(`/doctors/${id}/slots`)
        ]);
        
        setDoctor(doctorData);
        // Only show available slots that are in the future
        const now = new Date();
        const availableSlots = slotsData.filter(
          s => s.status === 'AVAILABLE' && new Date(s.startTime) > now
        );
        // Sort chronologically
        availableSlots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setSlots(availableSlots);
      } catch (err: any) {
        console.error("Failed to fetch:", err);
        setError("Failed to load doctor profile. They may not exist or are unavailable.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchDoctorAndSlots();
    }
  }, [id]);

  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !reason.trim() || reason.trim().length < 5) return;
    
    try {
      setIsBooking(true);
      setBookingError(null);
      
      await apiRequest('/appointments', {
        method: 'POST',
        token: session?.user?.accessToken,
        body: {
          slotId: selectedSlot.id,
          reasonForVisit: reason.trim()
        }
      });
      
      setBookingSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/appointments');
      }, 1500);
      
    } catch (err: any) {
      setBookingError(err.message || "Failed to book appointment. Please try again.");
    } finally {
      setIsBooking(false);
    }
  }

  if (loading) return <PageSkeleton />;

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <div className="bg-surface-white rounded-lg shadow-soft p-8 text-center max-w-md">
          <ExclamationTriangleIcon className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold font-serif text-text-primary mb-2">Profile Unavailable</h2>
          <p className="text-on-surface-variant mb-6">{error || "Doctor not found."}</p>
          <Button asChild>
            <Link href="/doctors">Return to Directory</Link>
          </Button>
        </div>
      </div>
    );
  }

  const initials = doctor.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-surface pb-12">
      {/* ── Toast (Top) ──────────────────────────────────────────────────────── */}
      {bookingSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-success text-white px-6 py-3 rounded-lg shadow-lifted flex items-center gap-3">
            <CheckCircledIcon className="w-5 h-5" />
            <span className="font-medium">Appointment booked successfully! Redirecting...</span>
          </div>
        </div>
      )}

      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
      <div className="bg-surface-white border-b border-outline-variant">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          <Link href="/doctors" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-8">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Doctors
          </Link>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="shrink-0">
              {doctor.profilePictureUrl ? (
                <img
                  src={doctor.profilePictureUrl}
                  alt={`Profile of ${doctor.fullName}`}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-primary/10 shadow-soft"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#48cab6] to-[#31a795] flex items-center justify-center ring-4 ring-primary/10 shadow-soft">
                  <span className="text-white font-bold text-3xl font-serif">{initials}</span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-text-primary mb-1">
                {doctor.professionalTitle ? `${doctor.professionalTitle} ` : ''}{doctor.fullName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-sm py-1 px-3">
                  {doctor.specialization}
                </Badge>
                {doctor.yearsOfExperience && (
                  <span className="text-sm text-on-surface-variant font-medium">
                    {doctor.yearsOfExperience}+ years experience
                  </span>
                )}
              </div>
              
              {(doctor.languagesSpoken || doctor.consultationFee !== undefined) && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-on-surface-variant bg-surface px-4 py-3 rounded-lg inline-flex">
                  {doctor.languagesSpoken && (
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wider text-outline mb-0.5">Languages</span>
                      <span className="font-medium text-on-surface">{doctor.languagesSpoken}</span>
                    </div>
                  )}
                  {doctor.consultationFee !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wider text-outline mb-0.5">Consultation Fee</span>
                      <span className="font-bold text-primary">₱{doctor.consultationFee.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: About & Details */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="font-serif text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <InfoCircledIcon className="w-6 h-6 text-primary" />
                About {doctor.fullName}
              </h2>
              <div className="prose prose-sm sm:prose-base text-on-surface-variant max-w-none">
                {doctor.bio ? (
                  doctor.bio.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-4">{paragraph}</p>
                  ))
                ) : (
                  <p className="italic">No biography information provided.</p>
                )}
              </div>
            </section>
            
            {doctor.consultationFocusAreas && (
              <section>
                <h3 className="font-serif text-xl font-bold text-text-primary mb-3">Focus Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {doctor.consultationFocusAreas.split(',').map((area, i) => (
                    <span key={i} className="bg-surface-container px-3 py-1.5 rounded-md text-sm text-on-surface-variant">
                      {area.trim()}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Booking panel */}
          <div className="lg:col-span-1">
            <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-[#48cab6]/10 to-[#31a795]/10 px-6 py-4 border-b border-outline-variant/30">
                <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Book Appointment
                </h3>
              </div>
              
              <div className="p-6">
                {!isAuthenticated ? (
                  <div className="text-center py-4">
                    <p className="text-on-surface-variant text-sm mb-4">You need to sign in to a patient account to book an appointment.</p>
                    <Button className="w-full" asChild>
                      <Link href="/login">Sign In to Book</Link>
                    </Button>
                  </div>
                ) : isDoctor ? (
                  <div className="text-center py-4 bg-surface rounded-lg p-4">
                    <p className="text-on-surface-variant text-sm">You are currently logged in as a doctor. Please switch to a patient account to book consultations.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">Available Slots</h4>
                      
                      <SlotPicker 
                        slots={slots} 
                        selectedSlot={selectedSlot} 
                        onSelectSlot={setSelectedSlot} 
                      />
                    </div>
                    
                    {selectedSlot && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <hr className="border-outline-variant/30 my-4" />
                        <form onSubmit={handleBookAppointment} className="space-y-4">
                          <div>
                            <label htmlFor="reason" className="block text-sm font-semibold text-text-primary mb-1">
                              Reason for Visit <span className="text-error">*</span>
                            </label>
                            <textarea
                              id="reason"
                              required
                              minLength={5}
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Briefly describe your symptoms or concern..."
                              className="w-full rounded-md border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-surface min-h-[80px]"
                            />
                          </div>
                          
                          {bookingError && (
                            <p className="text-xs text-error">{bookingError}</p>
                          )}
                          
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={isBooking || reason.trim().length < 5}
                          >
                            {isBooking ? "Confirming..." : "Confirm Booking"}
                          </Button>
                        </form>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  );
}
