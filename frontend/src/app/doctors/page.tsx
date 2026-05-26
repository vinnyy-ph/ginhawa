"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

interface Doctor {
  id: string;
  userId: string;
  fullName: string;
  professionalTitle: string;
  bio?: string;
  specialization: string;
  profilePictureUrl?: string;
  availabilitySummary?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
}

export default function DoctorsDiscoveryPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");

  useEffect(() => {
    async function fetchDoctors() {
      try {
        setLoading(true);
        const data = await apiRequest<Doctor[]>("/doctors");
        setDoctors(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to load doctors");
      } finally {
        setLoading(false);
      }
    }
    fetchDoctors();
  }, []);

  const specializations = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization));
    return Array.from(specs).filter(Boolean).sort();
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const matchesSearch = doctor.fullName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesSpec =
        !selectedSpecialization ||
        doctor.specialization === selectedSpecialization;
      return matchesSearch && matchesSpec;
    });
  }, [doctors, searchTerm, selectedSpecialization]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col space-y-6 md:flex-row md:items-end md:justify-between md:space-y-0 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary mb-2">
            Find a Doctor
          </h1>
          <p className="text-on-surface-variant text-lg">
            Search and book consultations with top medical professionals.
          </p>
        </div>
      </div>

      <div className="bg-surface-white p-4 rounded-xl shadow-soft mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="w-5 h-5 text-on-surface-variant" />
          </div>
          <input
            type="text"
            className="block w-full p-3 pl-10 text-sm rounded-lg border border-border focus:ring-primary focus:border-primary bg-surface-background text-text-primary outline-none transition-colors"
            placeholder="Search doctors by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <select
            className="block w-full p-3 text-sm rounded-lg border border-border focus:ring-primary focus:border-primary bg-surface-background text-text-primary outline-none transition-colors appearance-none cursor-pointer"
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
          >
            <option value="">All Specializations</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-error">
          <p>{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-20 bg-surface-white rounded-xl shadow-soft">
          <h3 className="text-xl font-medium text-text-primary mb-2">
            No doctors found
          </h3>
          <p className="text-on-surface-variant">
            Try adjusting your search or filter to find what you're looking for.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor) => (
            <Link key={doctor.id} href={`/doctors/${doctor.id}`} className="block group">
              <Card className="h-full transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg border border-transparent group-hover:border-primary/20 cursor-pointer overflow-hidden flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 border border-primary/20">
                      {doctor.profilePictureUrl ? (
                        <img
                          src={doctor.profilePictureUrl}
                          alt={doctor.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-semibold text-primary uppercase">
                          {doctor.fullName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-1 group-hover:text-primary transition-colors">
                        {doctor.professionalTitle ? `${doctor.professionalTitle} ` : ''}{doctor.fullName}
                      </CardTitle>
                      <CardDescription className="text-primary font-medium">
                        {doctor.specialization}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow pb-4">
                  {doctor.yearsOfExperience && (
                    <div className="text-sm text-on-surface-variant mb-2 flex items-center gap-2">
                      <span className="font-semibold">{doctor.yearsOfExperience}+</span> years experience
                    </div>
                  )}
                  {doctor.bio ? (
                    <p className="text-sm text-on-surface-variant line-clamp-3">
                      {doctor.bio}
                    </p>
                  ) : (
                    <p className="text-sm text-on-surface-variant italic opacity-70">
                      No biography available.
                    </p>
                  )}
                </CardContent>
                {doctor.consultationFee !== undefined && (
                  <CardFooter className="pt-0 flex justify-between items-center border-t border-border mt-auto pt-4">
                    <span className="text-sm font-medium text-text-primary">Consultation Fee</span>
                    <span className="font-bold text-primary">${doctor.consultationFee}</span>
                  </CardFooter>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
