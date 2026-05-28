"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircledIcon } from "@radix-ui/react-icons";

interface DoctorProfileData {
  fullName: string;
  professionalTitle: string;
  specialization: string;
  bio: string | null;
  yearsOfExperience: number | null;
  consultationFee: number | null;
  languagesSpoken?: string[] | null;
  consultationFocusAreas: string | null;
  availabilitySummary: string | null;
  profilePictureUrl: string | null;
}

export default function DoctorProfilePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState("");
  const [consultationFocusAreas, setConsultationFocusAreas] = useState("");
  const [availabilitySummary, setAvailabilitySummary] = useState("");

  useEffect(() => {
    if (!token) return;
    apiRequest<DoctorProfileData>("/doctors/profile", { token })
      .then((data) => {
        setFullName(data.fullName ?? "");
        setProfessionalTitle(data.professionalTitle ?? "");
        setSpecialization(data.specialization ?? "");
        setBio(data.bio ?? "");
        setYearsOfExperience(data.yearsOfExperience != null ? String(data.yearsOfExperience) : "");
        setConsultationFee(data.consultationFee != null ? String(data.consultationFee) : "");
        setLanguagesSpoken(data.languagesSpoken?.join(', ') ?? "");
        setConsultationFocusAreas(data.consultationFocusAreas ?? "");
        setAvailabilitySummary(data.availabilitySummary ?? "");
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
      await apiRequest("/doctors/profile", {
        method: "PATCH",
        token,
        body: {
          fullName: fullName.trim() || undefined,
          professionalTitle: professionalTitle.trim() || undefined,
          specialization: specialization.trim() || undefined,
          bio: bio.trim() || undefined,
          yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
          consultationFee: consultationFee ? Number(consultationFee) : undefined,
          languagesSpoken: languagesSpoken.trim()
            ? languagesSpoken.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          consultationFocusAreas: consultationFocusAreas.trim() || undefined,
          availabilitySummary: availabilitySummary.trim() || undefined,
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
    <DashboardLayout role="doctor">
      <div className="max-w-2xl animate-in fade-in duration-500">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Profile</h1>
          <p className="text-on-surface-variant">Update your professional information visible to patients.</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1">Full Name</label>
                  <input className={inputClass} value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1">Title (e.g. Dr., MD)</label>
                  <input className={inputClass} value={professionalTitle} onChange={e => setProfessionalTitle(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Specialization</label>
                <input className={inputClass} value={specialization} onChange={e => setSpecialization(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Bio</label>
                <textarea className={`${inputClass} min-h-[100px]`} value={bio} onChange={e => setBio(e.target.value)} placeholder="Brief professional background..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1">Years of Experience</label>
                  <input type="number" className={inputClass} value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value)} min="0" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1">Consultation Fee (₱)</label>
                  <input type="number" className={inputClass} value={consultationFee} onChange={e => setConsultationFee(e.target.value)} min="0" step="50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Languages Spoken</label>
                <input className={inputClass} value={languagesSpoken} onChange={e => setLanguagesSpoken(e.target.value)} placeholder="English, Filipino" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Focus Areas (comma-separated)</label>
                <input className={inputClass} value={consultationFocusAreas} onChange={e => setConsultationFocusAreas(e.target.value)} placeholder="Hypertension, Diabetes, Preventive Care" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1">Availability Summary</label>
                <input className={inputClass} value={availabilitySummary} onChange={e => setAvailabilitySummary(e.target.value)} placeholder="Mon–Fri 9am–5pm" />
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
