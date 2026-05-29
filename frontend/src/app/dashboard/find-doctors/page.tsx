"use client";

import React from "react";
import {
  MagnifyingGlassIcon,
  PersonIcon,
  ResetIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

import { DoctorCardCompact } from "@/components/doctors/DoctorCardCompact";
import { DoctorFilters } from "@/components/doctors/DoctorFilters";
import { DoctorSort } from "@/components/doctors/DoctorSort";
import { useDoctorDiscovery } from "@/components/doctors/use-doctor-discovery";

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-surface-white rounded-3xl border border-outline-variant/30 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-surface-container shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-container rounded w-3/4" />
          <div className="h-3 bg-surface-container rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-surface-container rounded" />
        <div className="h-3 bg-surface-container rounded w-5/6" />
      </div>
      <div className="mt-auto pt-5">
        <div className="pt-4 border-t border-outline-variant/20 flex gap-6 mb-4">
          <div className="h-8 w-16 bg-surface-container rounded" />
          <div className="h-8 w-16 bg-surface-container rounded" />
        </div>
        <div className="h-12 bg-surface-container rounded-2xl w-full" />
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
      <h3 className="font-bold text-xl text-text-primary mb-2">No doctors found</h3>
      <p className="text-on-surface-variant text-sm max-w-xs mb-6">
        We couldn&apos;t find any doctors matching your search or filters. Try a
        different keyword or clear your filters.
      </p>
      <Button variant="outline" onClick={onClearFilters} className="gap-2 border-primary text-primary hover:bg-primary/5">
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
      <h3 className="font-bold text-xl text-text-primary mb-2">
        Something went wrong
      </h3>
      <p className="text-on-surface-variant text-sm max-w-xs mb-6">{message}</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardFindDoctorsPage() {
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
    <DashboardLayout role="patient">
      {/* ── Page Heading ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Find a Doctor</h1>
        <p className="text-on-surface-variant text-base mt-2 max-w-2xl">
          Search and book consultations with top medical professionals — from
          the comfort of your home.
        </p>
      </div>

      {/* ── Search + Filter Panel ─────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4 mb-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <MagnifyingGlassIcon
              className="w-5 h-5 text-on-surface-variant"
              aria-hidden="true"
            />
          </div>
          <input
            id="dashboard-doctor-search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, specialization, or keyword…"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-outline-variant bg-surface-white text-on-surface placeholder:text-on-surface-variant/60 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            aria-label="Search doctors"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <DoctorFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableSpecializations={availableSpecializations}
              availableLanguages={availableLanguages}
            />

            {/* Live Summary */}
            {!loading && (
              <span className="text-sm text-on-surface-variant">
                Showing <strong className="text-text-primary">{filteredDoctors.length}</strong> result{filteredDoctors.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center">
            <DoctorSort value={sort} onChange={setSort} />
          </div>
        </div>
      </div>

      {/* ── Active filter indicator ──────────────────────────────────────── */}
      {(searchTerm || Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== "" && v !== "any")) && !loading && (
        <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
          <span className="text-on-surface-variant font-medium">Active filters:</span>
          {searchTerm && (
            <span className="bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/30 text-xs text-text-primary font-medium">
              Search: &quot;{searchTerm}&quot;
            </span>
          )}
          <button
            onClick={clearFilters}
            className="text-primary hover:underline font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 rounded px-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Grid / States ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDoctors} />
      ) : filteredDoctors.length === 0 ? (
        <EmptyState onClearFilters={clearFilters} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredDoctors.map((doctor) => (
            <DoctorCardCompact key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
