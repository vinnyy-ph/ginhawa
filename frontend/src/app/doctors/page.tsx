"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { apiRequest } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MagnifyingGlassIcon, PersonIcon, ResetIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { DoctorProfile } from "@/types/api";

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-surface-white rounded-lg shadow-soft overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-[#48cab6]/30 to-[#31a795]/30 rounded-t-lg" />
      <div className="p-5 space-y-3">
        <div className="flex gap-3 items-center">
          <div className="w-14 h-14 rounded-full bg-surface-container shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-surface-container rounded w-3/4" />
            <div className="h-3 bg-surface-container rounded w-1/2" />
          </div>
        </div>
        <div className="h-5 bg-surface-container rounded-full w-1/3" />
        <div className="h-3 bg-surface-container rounded" />
        <div className="h-3 bg-surface-container rounded w-5/6" />
        <div className="h-3 bg-surface-container rounded w-2/3" />
        <div className="flex justify-between items-center pt-2 border-t border-surface-container">
          <div className="h-3 bg-surface-container rounded w-1/3" />
          <div className="h-3 bg-surface-container rounded w-1/4" />
        </div>
        <div className="h-9 bg-surface-container rounded-md w-full mt-1" />
      </div>
    </div>
  );
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────

function DoctorCard({
  doctor,
  isPatient,
}: {
  doctor: DoctorProfile;
  isPatient: boolean;
}) {
  const initials = doctor.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-surface-white rounded-lg shadow-soft overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-lifted transition-all duration-200 border border-transparent hover:border-primary/10 group">
      {/* Gradient accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#48cab6] to-[#31a795]" />

      <div className="p-5 flex flex-col flex-1">
        {/* Header: avatar + name */}
        <div className="flex gap-4 items-start mb-3">
          <div className="shrink-0">
            {doctor.profilePictureUrl ? (
              <img
                src={doctor.profilePictureUrl}
                alt={`Profile photo of ${doctor.fullName}`}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full bg-gradient-to-br from-[#48cab6] to-[#31a795] flex items-center justify-center ring-2 ring-primary/10"
                aria-label={`Avatar for ${doctor.fullName}`}
              >
                <span className="text-white font-bold text-lg font-serif">
                  {initials}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-text-primary text-base leading-tight group-hover:text-primary transition-colors truncate">
              {doctor.professionalTitle
                ? `${doctor.professionalTitle} ${doctor.fullName}`
                : doctor.fullName}
            </h3>
            <p className="text-sm text-on-surface-variant mt-0.5 truncate">
              {doctor.professionalTitle || "General Practitioner"}
            </p>
          </div>
        </div>

        {/* Specialization badge */}
        <div className="mb-3">
          <Badge variant="outline" className="text-xs border-primary/40 text-primary font-medium">
            {doctor.specialization}
          </Badge>
        </div>

        {/* Stats row */}
        {(doctor.yearsOfExperience || doctor.consultationFee !== undefined) && (
          <div className="flex items-center gap-4 mb-3 text-xs text-on-surface-variant">
            {doctor.yearsOfExperience && (
              <span className="flex items-center gap-1">
                <span className="font-bold text-text-primary">
                  {doctor.yearsOfExperience}+
                </span>{" "}
                yrs exp
              </span>
            )}
            {doctor.consultationFee !== undefined && (
              <span className="flex items-center gap-1 ml-auto">
                <span className="font-bold text-primary">
                  ₱{doctor.consultationFee.toLocaleString()}
                </span>{" "}
                / session
              </span>
            )}
          </div>
        )}

        {/* Bio */}
        <p className="text-sm text-on-surface-variant line-clamp-2 flex-1 mb-4">
          {doctor.bio || "No biography available for this doctor."}
        </p>

        {/* CTA */}
        <Link
          href={`/doctors/${doctor.id}`}
          className="block mt-auto"
          aria-label={`${isPatient ? "Book appointment with" : "View profile of"} ${doctor.fullName}`}
        >
          <Button
            className={cn("w-full", isPatient ? "" : "variant-outline")}
            variant={isPatient ? "default" : "outline"}
          >
            {isPatient ? "Book Now" : "View Profile"}
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-5">
        <PersonIcon className="w-10 h-10 text-on-surface-variant/50" />
      </div>
      <h3 className="font-serif font-bold text-xl text-text-primary mb-2">
        No doctors found
      </h3>
      <p className="text-on-surface-variant text-sm max-w-xs mb-6">
        We couldn't find any doctors matching your search or filter. Try a
        different keyword or specialization.
      </p>
      <Button variant="outline" onClick={onClearFilters} className="gap-2">
        <ResetIcon className="w-4 h-4" />
        Clear Filters
      </Button>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5">
        <svg
          className="w-10 h-10 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h3 className="font-serif font-bold text-xl text-text-primary mb-2">
        Something went wrong
      </h3>
      <p className="text-on-surface-variant text-sm max-w-xs mb-6">{message}</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorsDiscoveryPage() {
  const { data: session } = useSession();
  const isPatient = session?.user?.role === "PATIENT";

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");

  async function fetchDoctors() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<DoctorProfile[]>("/doctors");
      setDoctors(data);
    } catch (err: any) {
      setError(err.message || "Failed to load doctors. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDoctors();
  }, []);

  const specializations = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization));
    return Array.from(specs).filter(Boolean).sort();
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        doctor.fullName.toLowerCase().includes(term) ||
        doctor.specialization.toLowerCase().includes(term) ||
        (doctor.bio?.toLowerCase().includes(term) ?? false);
      const matchesSpec =
        !selectedSpecialization ||
        doctor.specialization === selectedSpecialization;
      return matchesSearch && matchesSpec;
    });
  }, [doctors, searchTerm, selectedSpecialization]);

  function clearFilters() {
    setSearchTerm("");
    setSelectedSpecialization("");
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="bg-surface-white border-b border-outline-variant">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              {/* Decorative teal accent */}
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="h-1 w-8 rounded-full bg-gradient-to-r from-[#48cab6] to-[#31a795]" />
                <span className="text-xs font-semibold text-primary uppercase tracking-widest font-sans">
                  Ginhawa Telehealth
                </span>
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-text-primary leading-tight">
                Find a Doctor
              </h1>
              <p className="mt-2 text-on-surface-variant text-lg font-sans">
                Search and book consultations with top medical professionals —
                from the comfort of your home.
              </p>
            </div>

            {!loading && !error && doctors.length > 0 && (
              <div className="shrink-0">
                <p className="text-sm text-on-surface-variant text-right">
                  <span className="font-bold text-text-primary text-2xl">
                    {doctors.length}
                  </span>{" "}
                  doctors available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Search & Filters ──────────────────────────────────────────── */}
        <div className="bg-surface-white rounded-lg shadow-soft p-5 mb-8">
          {/* Search bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <MagnifyingGlassIcon className="w-5 h-5 text-on-surface-variant" aria-hidden="true" />
            </div>
            <input
              id="doctor-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, specialization, or keyword…"
              className="w-full pl-11 pr-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors font-sans"
              aria-label="Search doctors"
            />
          </div>

          {/* Specialization pills */}
          {!loading && specializations.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter by specialization"
            >
              <button
                onClick={() => setSelectedSpecialization("")}
                aria-pressed={selectedSpecialization === ""}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40",
                  selectedSpecialization === ""
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-transparent text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-primary"
                )}
              >
                All
              </button>
              {specializations.map((spec) => (
                <button
                  key={spec}
                  onClick={() =>
                    setSelectedSpecialization(
                      spec === selectedSpecialization ? "" : spec
                    )
                  }
                  aria-pressed={selectedSpecialization === spec}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40",
                    selectedSpecialization === spec
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-transparent text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-primary"
                  )}
                >
                  {spec}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Active filter indicator ───────────────────────────────────── */}
        {(searchTerm || selectedSpecialization) && !loading && (
          <div className="flex items-center gap-2 mb-5 text-sm text-on-surface-variant">
            <span>
              Showing{" "}
              <strong className="text-text-primary">{filteredDoctors.length}</strong>{" "}
              result{filteredDoctors.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={clearFilters}
              className="text-primary hover:underline font-medium ml-1 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Content ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDoctors} />
        ) : filteredDoctors.length === 0 ? (
          <EmptyState onClearFilters={clearFilters} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} isPatient={isPatient} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
