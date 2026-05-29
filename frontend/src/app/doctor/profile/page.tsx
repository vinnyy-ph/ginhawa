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

/** Display a field value in read-only mode */
function DisplayValue({ value }: { value: string | null | undefined }) {
  return (
    <p className="py-2 text-sm text-text-primary font-manrope leading-relaxed">
      {value?.trim() || <span className="text-on-surface-variant/50 italic">Not set</span>}
    </p>
  );
}

interface ProfileSnapshot {
  fullName: string; professionalTitle: string; profilePictureUrl: string | null;
  prcLicenseNo: string; prcLicenseExpiry: string; ptrNo: string;
  region: string; city: string; specialization: string;
  yearsOfExperience: string; languagesSpoken: string; bio: string;
  consultationFocusAreas: string; consultationFee: string; availabilitySummary: string;
}

export default function DoctorProfilePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;
  const { specializations, loading: specsLoading } = useSpecializations();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);

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

  function handleEditClick() {
    setSnapshot({
      fullName, professionalTitle, profilePictureUrl,
      prcLicenseNo, prcLicenseExpiry, ptrNo, region, city,
      specialization, yearsOfExperience, languagesSpoken, bio,
      consultationFocusAreas, consultationFee, availabilitySummary,
    });
    setIsEditing(true);
    setError(null);
  }

  function handleDiscard() {
    if (snapshot) {
      setFullName(snapshot.fullName);
      setProfessionalTitle(snapshot.professionalTitle);
      setProfilePictureUrl(snapshot.profilePictureUrl);
      setPrcLicenseNo(snapshot.prcLicenseNo);
      setPrcLicenseExpiry(snapshot.prcLicenseExpiry);
      setPtrNo(snapshot.ptrNo);
      setRegion(snapshot.region);
      setCity(snapshot.city);
      setSpecialization(snapshot.specialization);
      setYearsOfExperience(snapshot.yearsOfExperience);
      setLanguagesSpoken(snapshot.languagesSpoken);
      setBio(snapshot.bio);
      setConsultationFocusAreas(snapshot.consultationFocusAreas);
      setConsultationFee(snapshot.consultationFee);
      setAvailabilitySummary(snapshot.availabilitySummary);
    }
    setIsEditing(false);
    setError(null);
    setSnapshot(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !isEditing) return;

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
      setIsEditing(false);
      setSnapshot(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="doctor">
      <div className="animate-in fade-in duration-500">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Profile</h1>
            <p className="text-on-surface-variant">Update your professional information visible to patients.</p>
          </div>
          {isEditing ? (
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={handleDiscard} disabled={saving}>
                Discard Changes
              </Button>
              <Button type="submit" form="doctor-profile-form" disabled={saving} className="min-w-[140px]">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={handleEditClick} disabled={loading} className="min-w-[140px] shrink-0">
              Edit Profile
            </Button>
          )}
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

            <form id="doctor-profile-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
              <ProfileSection title="Personal">
                <ProfilePhotoField value={profilePictureUrl} onChange={setProfilePictureUrl} readOnly={!isEditing} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="d-fullName" label="Full name">
                    {isEditing ? (
                      <input id="d-fullName" className={onboardingInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    ) : (
                      <DisplayValue value={fullName} />
                    )}
                  </FormField>
                  <FormField id="d-title" label="Professional title">
                    {isEditing ? (
                      <input id="d-title" className={onboardingInputClass} placeholder="MD, FPCP" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} />
                    ) : (
                      <DisplayValue value={professionalTitle} />
                    )}
                  </FormField>
                </div>
              </ProfileSection>

              <ProfileSection title="Credentials">
                <FormField id="d-prc" label="PRC License Number">
                  {isEditing ? (
                    <input id="d-prc" inputMode="numeric" placeholder="0123456" className={onboardingInputClass} value={prcLicenseNo} onChange={(e) => setPrcLicenseNo(formatPrc(e.target.value))} />
                  ) : (
                    <DisplayValue value={prcLicenseNo} />
                  )}
                </FormField>
                <FormField id="d-prcExpiry" label="PRC License Expiry">
                  {isEditing ? (
                    <DatePicker id="d-prcExpiry" value={prcLicenseExpiry} onChange={setPrcLicenseExpiry} />
                  ) : (
                    <DisplayValue value={prcLicenseExpiry} />
                  )}
                </FormField>
                <FormField id="d-ptr" label="PTR Number">
                  {isEditing ? (
                    <input id="d-ptr" inputMode="numeric" placeholder="12345678" className={onboardingInputClass} value={ptrNo} onChange={(e) => setPtrNo(formatPtr(e.target.value))} />
                  ) : (
                    <DisplayValue value={ptrNo} />
                  )}
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="d-region" label="Region">
                    {isEditing ? (
                      <input id="d-region" className={onboardingInputClass} placeholder="NCR" value={region} onChange={(e) => setRegion(e.target.value)} />
                    ) : (
                      <DisplayValue value={region} />
                    )}
                  </FormField>
                  <FormField id="d-city" label="City">
                    {isEditing ? (
                      <input id="d-city" className={onboardingInputClass} placeholder="Makati" value={city} onChange={(e) => setCity(e.target.value)} />
                    ) : (
                      <DisplayValue value={city} />
                    )}
                  </FormField>
                </div>
              </ProfileSection>

              <ProfileSection title="Practice">
                <FormField id="d-spec" label="Primary Specialization">
                  {isEditing ? (
                    specFetchFailed ? (
                      <input id="d-spec" className={onboardingInputClass} placeholder="e.g. Cardiology" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                    ) : (
                      <select id="d-spec" className={onboardingInputClass} value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
                        <option value="" disabled>{specsLoading ? "Loading…" : "Select your specialization"}</option>
                        {specOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )
                  ) : (
                    <DisplayValue value={specialization} />
                  )}
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="d-years" label="Years of Experience">
                    {isEditing ? (
                      <input id="d-years" type="number" min="0" className={onboardingInputClass} value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value)} />
                    ) : (
                      <DisplayValue value={yearsOfExperience ? `${yearsOfExperience} years` : ""} />
                    )}
                  </FormField>
                  <FormField id="d-fee" label="Consultation Fee (₱)">
                    {isEditing ? (
                      <input id="d-fee" type="number" min="0" step="50" className={onboardingInputClass} value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} />
                    ) : (
                      <DisplayValue value={consultationFee ? `₱${Number(consultationFee).toLocaleString()}` : ""} />
                    )}
                  </FormField>
                </div>
                <FormField id="d-langs" label="Languages Spoken" hint={isEditing ? "Tap a suggestion or type your own, separated by commas" : undefined}>
                  {isEditing ? (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-wrap gap-2">
                        {COMMON_LANGUAGES.map((v) => (
                          <Chip key={v} selected={toItems(languagesSpoken).includes(v)} onClick={() => toggleLanguage(v)}>{v}</Chip>
                        ))}
                      </div>
                      <input id="d-langs" className={onboardingInputClass} placeholder="English, Tagalog" value={languagesSpoken} onChange={(e) => setLanguagesSpoken(e.target.value)} />
                    </div>
                  ) : (
                    <DisplayValue value={languagesSpoken} />
                  )}
                </FormField>
                <FormField id="d-bio" label="Professional Bio">
                  {isEditing ? (
                    <textarea id="d-bio" className={`${onboardingTextareaClass} min-h-[120px]`} placeholder="Tell patients about your background and approach to care..." value={bio} onChange={(e) => setBio(e.target.value)} />
                  ) : (
                    <DisplayValue value={bio} />
                  )}
                </FormField>
                <FormField id="d-focus" label="Focus Areas (comma-separated)">
                  {isEditing ? (
                    <textarea id="d-focus" className={onboardingTextareaClass} placeholder="Hypertension management, Preventive cardiology..." value={consultationFocusAreas} onChange={(e) => setConsultationFocusAreas(e.target.value)} />
                  ) : (
                    <DisplayValue value={consultationFocusAreas} />
                  )}
                </FormField>
                <FormField id="d-avail" label="Availability Summary">
                  {isEditing ? (
                    <input id="d-avail" className={onboardingInputClass} placeholder="Weekdays 9 AM - 5 PM" value={availabilitySummary} onChange={(e) => setAvailabilitySummary(e.target.value)} />
                  ) : (
                    <DisplayValue value={availabilitySummary} />
                  )}
                </FormField>
              </ProfileSection>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
