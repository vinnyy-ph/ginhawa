"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface Doctor {
  id: string;
  fullName: string;
  professionalTitle: string;
  specialization: string;
  bio: string;
}

export default function DoctorProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDoctor() {
      try {
        const response = await apiRequest(`/doctors/${id}`);
        setDoctor(response as Doctor);
      } catch (err) {
        console.error("Failed to fetch doctor details:", err);
        setError("Failed to load doctor details.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchDoctor();
    }
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center">Loading doctor profile...</div>;
  }

  if (error || !doctor) {
    return <div className="p-8 text-center text-red-500">{error || "Doctor not found."}</div>;
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{doctor.fullName}</h1>
            <h2 className="text-xl text-gray-600 mb-1">{doctor.professionalTitle}</h2>
            <p className="text-blue-600 font-medium mb-4">{doctor.specialization}</p>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">About</h3>
              <p className="text-gray-700 whitespace-pre-line">{doctor.bio}</p>
            </div>
            
            <Button className="w-full md:w-auto">Book Appointment</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
