"use client";

/**
 * Route: /my-doctors — patient's personal doctor roster (authenticated patients only).
 *
 * Fetches the list of doctors the patient has had at least one appointment with
 * from GET /appointments/patient/doctors. Supports client-side search by name
 * or specialization. Each card shows visit history, upcoming appointment count,
 * and quick-access links to view the doctor's profile or book again.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { formatPHDate } from "@/lib/datetime";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { MagnifyingGlassIcon, PersonIcon } from "@radix-ui/react-icons";
import type { PatientDoctorSummary } from "@/types/api";

/**
 * Renders the "My Doctors" dashboard view. Waits for the session to resolve
 * before fetching so the API call always carries a valid bearer token.
 */
export default function MyDoctorsPage() {
  const { data: session, status } = useSession();
  const token = session?.user?.accessToken;

  const [doctors, setDoctors] = useState<PatientDoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchDoctors = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await apiRequest<PatientDoctorSummary[]>(
        "/appointments/patient/doctors",
        { token },
      );
      setDoctors(data);
    } catch {
      setError("Failed to load your doctors.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status === "loading") return;
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    fetchDoctors();
  }, [token, status, fetchDoctors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.doctor.fullName.toLowerCase().includes(q) ||
        d.doctor.specialization.toLowerCase().includes(q),
    );
  }, [doctors, query]);

  return (
    <DashboardLayout role="patient">
      <div className="mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold text-text-primary">My Doctors</h1>
          <p className="text-on-surface-variant mt-1">
            Everyone you&apos;ve had an appointment with.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or specialty…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline/40 bg-surface-white text-text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : error ? (
          <div className="bg-surface-white p-8 rounded-xl shadow-soft text-center text-on-surface-variant">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface-white p-10 rounded-xl shadow-soft text-center">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3">
              <PersonIcon className="w-6 h-6 text-on-surface-variant" />
            </div>
            <h3 className="font-semibold text-text-primary mb-1">
              {query ? "No doctors match your search" : "No doctors yet"}
            </h3>
            <p className="text-sm text-on-surface-variant mb-4">
              {query
                ? "Try a different name or specialty."
                : "Doctors appear here once you've had an appointment."}
            </p>
            {!query && (
              <Link
                href="/doctors"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Find a Doctor
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(({ doctor, totalVisits, upcomingCount, lastVisit }) => (
              <div
                key={doctor.id}
                className="bg-surface-white rounded-xl shadow-soft flex items-center gap-4 p-4"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                  {doctor.profilePictureUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={doctor.profilePictureUrl}
                      alt={doctor.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    doctor.fullName.charAt(0)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-text-primary truncate">{doctor.fullName}</h4>
                  <p className="text-xs text-on-surface-variant">{doctor.professionalTitle}</p>
                  <p className="text-xs text-primary font-semibold">{doctor.specialization}</p>
                </div>

                {/* Stats — hidden on mobile */}
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm text-on-surface-variant">
                    {totalVisits} {totalVisits === 1 ? "visit" : "visits"}
                    {lastVisit && (
                      <>
                        {" · Last: "}
                        <span className="text-text-primary font-medium">
                          {formatPHDate(lastVisit, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </span>
                  {upcomingCount > 0 && (
                    <Badge variant="default">{upcomingCount} upcoming</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/doctors/${doctor.id}`}
                    className="px-3 py-1.5 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    View Profile
                  </Link>
                  <Link
                    href={`/doctors/${doctor.id}`}
                    className="px-3 py-1.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Book Again
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
