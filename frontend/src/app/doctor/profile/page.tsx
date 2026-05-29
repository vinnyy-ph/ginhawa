"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Chip } from "@/components/ui/chip";
import { ProfileSection } from "@/components/ui/profile-section";
import { ProfilePhotoField } from "@/components/ui/profile-photo-field";
import { DatePicker } from "@/components/ui/date-picker";
import { useSpecializations } from "@/hooks/use-specializations";
import {
  onboardingInputClass,
  onboardingTextareaClass,
} from "@/lib/onboarding-styles";
import {
  formatPrc,
  formatPtr,
  isValidPrc,
  isValidPtr,
} from "@/lib/format";

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
  prcLicenseNo: string | null;
  prcLicenseExpiry: string | null;
  ptrNo: string | null;
  region: string | null;
  city: string | null;
}

const COMMON_LANGUAGES = ["English", "Tagalog", "Cebuano", "Ilocano"];

const toItems = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function DoctorProfilePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const { specializations, loading: specsLoading } = useSpecializations();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  const [prcLicenseNo, setPrcLicenseNo] = useState("");
  const [prcLicenseExpiry, setPrcLicenseExpiry] = useState("");
  const [ptrNo, setPtrNo] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");

  const [specialization, setSpecialization] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState("");
  const [bio, setBio] = useState("");
  const [consultationFocusAreas, setConsultationFocusAreas] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [availabilitySummary, setAvailabilitySummary] = useState("");

  useEffect(() => {
    if (!token) return;
    apiRequest<DoctorProfileData>("/doctors/profile", { token })
      .then((d) => {
        setFullName(d.fullName ?? "");
        setProfessionalTitle(d.professionalTitle ?? "");
        setProfilePictureUrl(d.profilePictureUrl ?? null);
        setPrcLicenseNo(d.prcLicenseNo ?? "");
        setPrcLicenseExpiry(d.prcLicenseExpiry ? d.prcLicenseExpiry.split("T")[0] : "");
        setPtrNo(d.ptrNo ?? "");
        setRegion(d.region ?? "");
        setCity(d.city ?? "");
        setSpecialization(d.specialization ?? "");
        setYearsOfExperience(d.yearsOfExperience != null ? String(d.yearsOfExperience) : "");
        setLanguagesSpoken(d.languagesSpoken?.join(", ") ?? "");
        setBio(d.bio ?? "");
        setConsultationFocusAreas(d.consultationFocusAreas ?? "");
        setConsultationFee(d.consultationFee != null ? String(d.consultationFee) : "");
        setAvailabilitySummary(d.availabilitySummary ?? "");
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [token]);

  // Keep an already-saved specialization selectable even if not in the fetched list.
  const specOptions =
    specialization && !specializations.includes(specialization)
      ? [specialization, ...specializations]
      : specializations;
  const specFetchFailed = !specsLoading && specializations.length === 0;

  const toggleLanguage = (value: string) => {
    const items = toItems(languagesSpoken);
    const next = items.includes(value)
      ? items.filter((i) => i !== value)
      : [...items, value];
    setLanguagesSpoken(next.join(", "));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (prcLicenseNo && !isValidPrc(prcLicenseNo)) {
      setError("PRC license number must be 7 digits, or leave it blank.");
      return;
    }
    if (ptrNo && !isValidPtr(ptrNo)) {
      setError("PTR number must be 7–8 digits, or leave it blank.");
      return;
    }

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
          profilePictureUrl: profilePictureUrl || undefined,
          prcLicenseNo: prcLicenseNo.trim() || undefined,
          prcLicenseExpiry: prcLicenseExpiry || undefined,
          ptrNo: ptrNo.trim() || undefined,
          region: region.trim() || undefined,
          city: city.trim() || undefined,
          specialization: specialization.trim() || undefined,
          yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
          languagesSpoken: languagesSpoken.trim()
            ? languagesSpoken.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          bio: bio.trim() || undefined,
          consultationFocusAreas: consultationFocusAreas.trim() || undefined,
          consultationFee: consultationFee ? Number(consultationFee) : undefined,
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
              <Alert variant="success" className="mb-6">
                Profile updated successfully.
              </Alert>
            )}
            {error && (
              <Alert variant="error" className="mb-6">{error}</Alert>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <ProfileSection title="Personal">
                <ProfilePhotoField value={profilePictureUrl} onChange={setProfilePictureUrl} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="d-fullName" label="Full name">
                    <input id="d-fullName" className={onboardingInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </FormField>
                  <FormField id="d-title" label="Professional title">
                    <input id="d-title" className={onboardingInputClass} placeholder="MD, FPCP" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} />
                  </FormField>
                </div>
              </ProfileSection>

              <ProfileSection title="Credentials">
                <FormField id="d-prc" label="PRC License Number">
                  <input id="d-prc" inputMode="numeric" placeholder="0123456" className={onboardingInputClass} value={prcLicenseNo} onChange={(e) => setPrcLicenseNo(formatPrc(e.target.value))} />
                </FormField>
                <FormField id="d-prcExpiry" label="PRC License Expiry">
                  <DatePicker id="d-prcExpiry" value={prcLicenseExpiry} onChange={setPrcLicenseExpiry} />
                </FormField>
                <FormField id="d-ptr" label="PTR Number">
                  <input id="d-ptr" inputMode="numeric" placeholder="12345678" className={onboardingInputClass} value={ptrNo} onChange={(e) => setPtrNo(formatPtr(e.target.value))} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="d-region" label="Region">
                    <input id="d-region" className={onboardingInputClass} placeholder="NCR" value={region} onChange={(e) => setRegion(e.target.value)} />
                  </FormField>
                  <FormField id="d-city" label="City">
                    <input id="d-city" className={onboardingInputClass} placeholder="Makati" value={city} onChange={(e) => setCity(e.target.value)} />
                  </FormField>
                </div>
              </ProfileSection>

              <ProfileSection title="Practice">
                <FormField id="d-spec" label="Primary Specialization">
                  {specFetchFailed ? (
                    <input id="d-spec" className={onboardingInputClass} placeholder="e.g. Cardiology" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                  ) : (
                    <select id="d-spec" className={onboardingInputClass} value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
                      <option value="" disabled>{specsLoading ? "Loading…" : "Select your specialization"}</option>
                      {specOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="d-years" label="Years of Experience">
                    <input id="d-years" type="number" min="0" className={onboardingInputClass} value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value)} />
                  </FormField>
                  <FormField id="d-fee" label="Consultation Fee (₱)">
                    <input id="d-fee" type="number" min="0" step="50" className={onboardingInputClass} value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} />
                  </FormField>
                </div>
                <FormField id="d-langs" label="Languages Spoken" hint="Tap a suggestion or type your own, separated by commas">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      {COMMON_LANGUAGES.map((v) => (
                        <Chip key={v} selected={toItems(languagesSpoken).includes(v)} onClick={() => toggleLanguage(v)}>{v}</Chip>
                      ))}
                    </div>
                    <input id="d-langs" className={onboardingInputClass} placeholder="English, Tagalog" value={languagesSpoken} onChange={(e) => setLanguagesSpoken(e.target.value)} />
                  </div>
                </FormField>
                <FormField id="d-bio" label="Professional Bio">
                  <textarea id="d-bio" className={`${onboardingTextareaClass} min-h-[120px]`} placeholder="Tell patients about your background and approach to care..." value={bio} onChange={(e) => setBio(e.target.value)} />
                </FormField>
                <FormField id="d-focus" label="Focus Areas (comma-separated)">
                  <textarea id="d-focus" className={onboardingTextareaClass} placeholder="Hypertension management, Preventive cardiology..." value={consultationFocusAreas} onChange={(e) => setConsultationFocusAreas(e.target.value)} />
                </FormField>
                <FormField id="d-avail" label="Availability Summary">
                  <input id="d-avail" className={onboardingInputClass} placeholder="Weekdays 9 AM - 5 PM" value={availabilitySummary} onChange={(e) => setAvailabilitySummary(e.target.value)} />
                </FormField>
              </ProfileSection>

              <div className="flex justify-end">
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
