"use client";

import React from "react";
import { useSession } from "next-auth/react";
import {
  MagnifyingGlassIcon,
  PersonIcon,
  ResetIcon,
  HeartIcon
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

import { DoctorCard } from "@/components/doctors/DoctorCard";
import { DoctorFilters } from "@/components/doctors/DoctorFilters";
import { DoctorSort } from "@/components/doctors/DoctorSort";
import { useDoctorDiscovery } from "@/components/doctors/use-doctor-discovery";

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-surface-white rounded-3xl shadow-sm border border-outline-variant/30 p-6 flex flex-col sm:flex-row gap-6">
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-surface-container shrink-0 mx-auto sm:mx-0" />
      <div className="flex-1 space-y-5">
        <div className="flex justify-between items-start">
          <div className="space-y-3 w-full max-w-sm">
            <div className="h-6 bg-surface-container rounded w-3/4" />
            <div className="h-4 bg-surface-container rounded w-1/2" />
          </div>
          <div className="hidden sm:block h-6 w-24 bg-surface-container rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-surface-container rounded w-full" />
          <div className="h-4 bg-surface-container rounded w-5/6" />
        </div>
        <div className="pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-4">
            <div className="h-8 w-20 bg-surface-container rounded" />
            <div className="h-8 w-20 bg-surface-container rounded" />
          </div>
          <div className="h-10 w-full sm:w-32 bg-surface-container rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-24 h-24 rounded-full bg-surface-container/50 border border-outline-variant/30 flex items-center justify-center mb-6">
        <PersonIcon className="w-12 h-12 text-on-surface-variant/40" />
      </div>
      <h3 className="font-bold font-serif text-2xl text-text-primary mb-3">No specialists found</h3>
      <p className="text-on-surface-variant text-base max-w-sm mb-8 leading-relaxed">
        We couldn&apos;t find any doctors matching your criteria right now. Please try adjusting your filters or search terms.
      </p>
      <Button variant="outline" onClick={onClearFilters} className="gap-2 border-primary/50 text-primary hover:bg-primary/5 rounded-full px-8 py-6">
        <ResetIcon className="w-5 h-5" />
        Reset Search
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
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-24 h-24 rounded-full bg-error/10 border border-error/20 flex items-center justify-center mb-6">
        <svg
          className="w-12 h-12 text-error"
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
      <h3 className="font-bold font-serif text-2xl text-text-primary mb-3">
        Connection Interrupted
      </h3>
      <p className="text-on-surface-variant text-base max-w-sm mb-8 leading-relaxed">
        We had trouble loading the doctor directory. {message}
      </p>
      <Button onClick={onRetry} className="rounded-full px-8 py-6 text-base">Try Again</Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorsDiscoveryPage() {
  const { data: session } = useSession();
  const isPatient = session?.user?.role === "PATIENT";

  const {
    filteredDoctors,
    loading,
    error,
    fetchDoctors,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    sort,
    setSort,
    availableSpecializations,
    availableLanguages,
    clearFilters,
  } = useDoctorDiscovery();

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <main className="flex-grow pb-24">
        {/* ── Soft Hero Section ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-surface-white border-b border-outline-variant/30 py-16 md:py-24">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 right-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute top-[20%] left-[-10%] h-[400px] w-[400px] rounded-full bg-secondary-container/10 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_50%_0%,rgba(72,202,182,0.04),transparent_80%)]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold tracking-wide uppercase">
                <HeartIcon className="w-4 h-4" />
                <span>Our Medical Network</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-text-primary leading-tight font-serif tracking-tight">
                Find the right specialist for your care.
              </h1>
              <p className="mt-6 text-on-surface-variant text-lg md:text-xl leading-relaxed max-w-2xl">
                Browse our trusted network of board-certified doctors, read patient reviews, and book a secure teleconsultation when you&apos;re ready.
              </p>
            </div>

            {/* Search bar inside hero */}
            <div className="relative mt-10 max-w-2xl">
              <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                <MagnifyingGlassIcon
                  className="w-6 h-6 text-on-surface-variant/60"
                  aria-hidden="true"
                />
              </div>
              <input
                id="doctor-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, specialization, or condition..."
                className="w-full pl-14 pr-6 py-5 rounded-2xl border border-outline-variant/40 bg-surface-white text-on-surface placeholder:text-on-surface-variant/50 text-lg shadow-lifted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                aria-label="Search doctors"
              />
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* ── Filter and Sort Header ────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-sm">
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <DoctorFilters
                filters={filters}
                onFiltersChange={setFilters}
                availableSpecializations={availableSpecializations}
                availableLanguages={availableLanguages}
              />
              
              {/* Live Summary */}
              {!loading && (
                <span className="text-sm font-medium text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/20">
                  <strong className="text-primary">{filteredDoctors.length}</strong> specialist{filteredDoctors.length !== 1 ? "s" : ""} available
                </span>
              )}
            </div>
            
            <div className="flex items-center w-full sm:w-auto">
              <DoctorSort value={sort} onChange={setSort} />
            </div>
          </div>

          {/* ── Active filter indicator ────────────────────────────────────── */}
          {(searchTerm || Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== "" && v !== "any")) && !loading && (
            <div className="flex flex-wrap items-center gap-2 mb-8 text-sm">
              <span className="text-on-surface-variant font-semibold">Active filters:</span>
              {searchTerm && (
                <span className="bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 text-primary font-semibold flex items-center gap-2">
                  <span>Search: &quot;{searchTerm}&quot;</span>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors font-semibold text-xs rounded-full px-3 py-1.5"
              >
                Clear all
              </button>
            </div>
          )}

          {/* ── Grid / States ──────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={fetchDoctors} />
          ) : filteredDoctors.length === 0 ? (
            <EmptyState onClearFilters={clearFilters} />
          ) : (
            <div className="flex flex-col gap-6">
              {filteredDoctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} isPatient={isPatient} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}