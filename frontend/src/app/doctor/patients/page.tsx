"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { MagnifyingGlassIcon, PersonIcon } from "@radix-ui/react-icons";
import type { DoctorPatientSummary } from "@/types/api";

const SNIPPET_PAD = 30;

function matchSnippet(
  searchText: string,
  query: string,
): { before: string; match: string; after: string } | null {
  const idx = searchText.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - SNIPPET_PAD);
  const end = Math.min(searchText.length, idx + query.length + SNIPPET_PAD);
  return {
    before: (start > 0 ? "…" : "") + searchText.slice(start, idx),
    match: searchText.slice(idx, idx + query.length),
    after: searchText.slice(idx + query.length, end) + (end < searchText.length ? "…" : ""),
  };
}

export default function DoctorPatientsPage() {
  const { data: session, status } = useSession();
  const token = session?.user?.accessToken;

  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status]);

  async function fetchPatients() {
    if (!token) return;
    try {
      setLoading(true);
      const data = await apiRequest<DoctorPatientSummary[]>(
        "/appointments/doctor/patients",
        { token },
      );
      setPatients(data);
    } catch {
      setError("Failed to load your patients.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients.map(p => ({ row: p, snippet: null as ReturnType<typeof matchSnippet> }));
    return patients
      .filter(
        p =>
          p.patient.fullName.toLowerCase().includes(q) ||
          p.searchText.toLowerCase().includes(q),
      )
      .map(p => {
        const nameMatch = p.patient.fullName.toLowerCase().includes(q);
        return {
          row: p,
          snippet: nameMatch ? null : matchSnippet(p.searchText, q),
        };
      });
  }, [patients, query]);

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold text-text-primary">Patients</h1>
          <p className="text-on-surface-variant mt-1">
            Everyone who has booked an appointment with you.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or consultation keyword…"
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
              {query ? "No patients match your search" : "No patients yet"}
            </h3>
            <p className="text-sm text-on-surface-variant">
              {query
                ? "Try a different name or keyword."
                : "Patients appear here once they book an appointment with you."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(({ row, snippet }) => (
              <Link
                key={row.patient.id}
                href={`/doctor/patients/${row.patient.id}`}
                className="bg-surface-white p-5 rounded-xl shadow-soft flex flex-col gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant font-serif font-bold text-xl shrink-0">
                    {row.patient.fullName.charAt(0) || "P"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-text-primary truncate">
                      {row.patient.fullName}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {row.totalVisits}{" "}
                      {row.totalVisits === 1 ? "appointment" : "appointments"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm border-t border-outline/20 pt-3">
                  <span className="text-on-surface-variant">
                    Last visit:{" "}
                    <span className="text-text-primary font-medium">
                      {row.lastVisit
                        ? new Date(row.lastVisit).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </span>
                  {row.upcomingCount > 0 && (
                    <Badge variant="default">{row.upcomingCount} upcoming</Badge>
                  )}
                </div>
                {snippet && (
                  <p className="text-xs text-on-surface-variant border-t border-outline/20 pt-2 line-clamp-2">
                    Matched:{" "}
                    <span className="italic">
                      {snippet.before}
                      <mark className="bg-primary/15 text-text-primary font-semibold rounded px-0.5">
                        {snippet.match}
                      </mark>
                      {snippet.after}
                    </span>
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
