"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircledIcon } from "@radix-ui/react-icons";

interface PatientProfileData {
  fullName: string;
  birthdate: string;
  weight: number | null;
  height: number | null;
  contactDetails: string | null;
  medicalHistory: string | null;
  profilePictureUrl: string | null;
}

export default function PatientProfilePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [contactDetails, setContactDetails] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");

  useEffect(() => {
    if (!token) return;
    apiRequest<PatientProfileData>("/patients/profile", { token })
      .then((data) => {
        setFullName(data.fullName ?? "");
        setBirthdate(data.birthdate ? data.birthdate.split("T")[0] : "");
        setWeight(data.weight != null ? String(data.weight) : "");
        setHeight(data.height != null ? String(data.height) : "");
        setContactDetails(data.contactDetails ?? "");
        setMedicalHistory(data.medicalHistory ?? "");
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiRequest("/patients/profile", {
        method: "PATCH",
        token,
        body: {
          fullName: fullName.trim() || undefined,
          birthdate: birthdate || undefined,
          weight: weight ? Number(weight) : undefined,
          height: height ? Number(height) : undefined,
          contactDetails: contactDetails.trim() || undefined,
          medicalHistory: medicalHistory.trim() || undefined,
        },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-outline-variant px-3 py-2.5 text-sm text-on-surface bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";

  return (
    <DashboardLayout role="patient">
      <div className="max-w-2xl animate-in fade-in duration-500">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Profile</h1>
          <p className="text-on-surface-variant">Update your personal and medical information.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6">
            {success && (
              <div className="mb-6 flex items-center gap-2 text-sm text-success bg-success/10 px-4 py-3 rounded-lg border border-success/20">
                <CheckCircledIcon className="w-4 h-4 shrink-0" />
                Profile updated successfully.
              </div>
            )}
            {error && (
              <div className="mb-6 text-sm text-error bg-red-50 px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Full Name</label>
                <input className={inputClass} value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Birthdate</label>
                <input type="date" className={inputClass} value={birthdate} onChange={e => setBirthdate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1">Weight (kg)</label>
                  <input type="number" className={inputClass} value={weight} onChange={e => setWeight(e.target.value)} min="0" step="0.1" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1">Height (cm)</label>
                  <input type="number" className={inputClass} value={height} onChange={e => setHeight(e.target.value)} min="0" step="0.1" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Contact Details</label>
                <input className={inputClass} value={contactDetails} onChange={e => setContactDetails(e.target.value)} placeholder="Phone number or alternative email" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Medical History</label>
                <textarea className={`${inputClass} min-h-[100px]`} value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} placeholder="Known conditions, allergies, medications..." />
              </div>
              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={saving} className="min-w-[120px]">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
