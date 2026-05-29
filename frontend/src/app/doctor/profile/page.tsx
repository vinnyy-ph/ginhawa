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

/** Muted placeholder for empty read-only fields */
function Empty() {
  return <span className="text-on-surface-variant/40 italic text-sm">Not set</span>;
}

/** A labelled read-only display row */
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60 font-manrope">
        {label}
      </span>
      <span className="text-sm text-text-primary font-manrope leading-relaxed">
        {value?.trim() ? value.trim() : <Empty />}
      </span>
    </div>
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

        {/* ── Page header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Profile</h1>
            <p className="text-on-surface-variant">
              {isEditing ? "Make changes below, then save when you're done." : "Your professional information visible to patients."}
            </p>
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
          <>
            {success && <Alert variant="success" className="mb-6">Profile updated successfully.</Alert>}
            {error && <Alert variant="error" className="mb-6">{error}</Alert>}

            <form id="doctor-profile-form" onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* ══════════════════════════════════
                  CARD 1 — Identity
                  Photo · Name · Title · Bio
              ══════════════════════════════════ */}
              <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
                {/* Coloured accent strip */}
                <div className="h-1.5 bg-gradient-to-r from-brand-light to-brand" />

                <div className="p-6 flex flex-col gap-6">
                  {/* Photo + name row */}
                  <div className="flex items-start gap-6">
                    <ProfilePhotoField
                      value={profilePictureUrl}
                      onChange={setProfilePictureUrl}
                      readOnly={!isEditing}
                    />
                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                      {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField id="d-fullName" label="Full name">
                            <input
                              id="d-fullName"
                              className={onboardingInputClass}
                              placeholder="Dr. Juan dela Cruz"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                            />
                          </FormField>
                          <FormField id="d-title" label="Professional title">
                            <input
                              id="d-title"
                              className={onboardingInputClass}
                              placeholder="MD, FPCP"
                              value={professionalTitle}
                              onChange={(e) => setProfessionalTitle(e.target.value)}
                            />
                          </FormField>
                        </div>
                      ) : (
                        <div>
                          <p className="text-2xl font-bold font-serif text-text-primary leading-tight">
                            {fullName || <span className="text-on-surface-variant/40 italic font-normal text-lg">Name not set</span>}
                          </p>
                          {professionalTitle && (
                            <p className="text-sm text-on-surface-variant font-manrope mt-1">{professionalTitle}</p>
                          )}
                          {specialization && (
                            <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary font-manrope">
                              {specialization}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="border-t border-outline-variant/20 pt-5">
                    {isEditing ? (
                      <FormField id="d-bio" label="Professional bio">
                        <textarea
                          id="d-bio"
                          className={`${onboardingTextareaClass} min-h-[100px]`}
                          placeholder="Tell patients about your background, approach to care, and what makes you unique..."
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                        />
                      </FormField>
                    ) : (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 font-manrope mb-2">About</p>
                        <p className="text-sm text-text-primary font-manrope leading-relaxed">
                          {bio?.trim() || <Empty />}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════
                  CARD 2 — Practice Details
                  Spec · Experience · Fee · Availability · Languages · Focus Areas
              ══════════════════════════════════ */}
              <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6 flex flex-col gap-6">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-manrope">
                  Practice Details
                </p>

                {/* Specialization + Years */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="d-spec" label="Primary specialization">
                    {isEditing ? (
                      specFetchFailed ? (
                        <input
                          id="d-spec"
                          className={onboardingInputClass}
                          placeholder="e.g. Cardiology"
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                        />
                      ) : (
                        <select
                          id="d-spec"
                          className={onboardingInputClass}
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                        >
                          <option value="" disabled>
                            {specsLoading ? "Loading…" : "Select specialization"}
                          </option>
                          {specOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )
                    ) : (
                      <InfoRow label="" value={specialization} />
                    )}
                  </FormField>
                  <FormField id="d-years" label="Years of experience">
                    {isEditing ? (
                      <input
                        id="d-years"
                        type="number"
                        min="0"
                        className={onboardingInputClass}
                        placeholder="0"
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(e.target.value)}
                      />
                    ) : (
                      <InfoRow label="" value={yearsOfExperience ? `${yearsOfExperience} ${Number(yearsOfExperience) === 1 ? "year" : "years"}` : ""} />
                    )}
                  </FormField>
                </div>

                {/* Fee + Availability */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="d-fee" label="Consultation fee (₱)">
                    {isEditing ? (
                      <input
                        id="d-fee"
                        type="number"
                        min="0"
                        step="50"
                        className={onboardingInputClass}
                        placeholder="500"
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(e.target.value)}
                      />
                    ) : (
                      <InfoRow label="" value={consultationFee ? `₱${Number(consultationFee).toLocaleString()}` : ""} />
                    )}
                  </FormField>
                  <FormField id="d-avail" label="Availability">
                    {isEditing ? (
                      <input
                        id="d-avail"
                        className={onboardingInputClass}
                        placeholder="Weekdays 9 AM – 5 PM"
                        value={availabilitySummary}
                        onChange={(e) => setAvailabilitySummary(e.target.value)}
                      />
                    ) : (
                      <InfoRow label="" value={availabilitySummary} />
                    )}
                  </FormField>
                </div>

                {/* Languages */}
                <FormField
                  id="d-langs"
                  label="Languages spoken"
                  hint={isEditing ? "Tap a chip or type your own, comma-separated" : undefined}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-wrap gap-2">
                        {COMMON_LANGUAGES.map((v) => (
                          <Chip
                            key={v}
                            selected={toItems(languagesSpoken).includes(v)}
                            onClick={() => toggleLanguage(v)}
                          >
                            {v}
                          </Chip>
                        ))}
                      </div>
                      <input
                        id="d-langs"
                        className={onboardingInputClass}
                        placeholder="English, Tagalog"
                        value={languagesSpoken}
                        onChange={(e) => setLanguagesSpoken(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 py-1">
                      {toItems(languagesSpoken).length > 0
                        ? toItems(languagesSpoken).map((lang) => (
                          <span
                            key={lang}
                            className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-variant text-on-surface-variant font-manrope"
                          >
                            {lang}
                          </span>
                        ))
                        : <Empty />
                      }
                    </div>
                  )}
                </FormField>

                {/* Focus Areas */}
                <FormField id="d-focus" label="Focus areas">
                  {isEditing ? (
                    <textarea
                      id="d-focus"
                      className={onboardingTextareaClass}
                      placeholder="Hypertension management, Preventive cardiology, Cardiac rehabilitation…"
                      value={consultationFocusAreas}
                      onChange={(e) => setConsultationFocusAreas(e.target.value)}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2 py-1">
                      {toItems(consultationFocusAreas).length > 0
                        ? toItems(consultationFocusAreas).map((area) => (
                          <span
                            key={area}
                            className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/8 text-primary font-manrope border border-primary/20"
                          >
                            {area}
                          </span>
                        ))
                        : <Empty />
                      }
                    </div>
                  )}
                </FormField>
              </div>

              {/* ══════════════════════════════════
                  CARD 3 — Credentials & Location
                  PRC · PTR · Region · City
              ══════════════════════════════════ */}
              <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6 flex flex-col gap-6">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-manrope">
                  Credentials &amp; Location
                </p>

                {/* PRC License No + Expiry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="d-prc" label="PRC license number">
                    {isEditing ? (
                      <input
                        id="d-prc"
                        inputMode="numeric"
                        placeholder="0123456"
                        className={onboardingInputClass}
                        value={prcLicenseNo}
                        onChange={(e) => setPrcLicenseNo(formatPrc(e.target.value))}
                      />
                    ) : (
                      <InfoRow label="" value={prcLicenseNo} />
                    )}
                  </FormField>
                  <FormField id="d-prcExpiry" label="PRC license expiry">
                    {isEditing ? (
                      <DatePicker
                        id="d-prcExpiry"
                        value={prcLicenseExpiry}
                        onChange={setPrcLicenseExpiry}
                      />
                    ) : (
                      <InfoRow label="" value={prcLicenseExpiry} />
                    )}
                  </FormField>
                </div>

                {/* PTR Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="d-ptr" label="PTR number">
                    {isEditing ? (
                      <input
                        id="d-ptr"
                        inputMode="numeric"
                        placeholder="12345678"
                        className={onboardingInputClass}
                        value={ptrNo}
                        onChange={(e) => setPtrNo(formatPtr(e.target.value))}
                      />
                    ) : (
                      <InfoRow label="" value={ptrNo} />
                    )}
                  </FormField>
                </div>

                {/* Divider */}
                <div className="border-t border-outline-variant/20" />

                {/* Region + City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="d-region" label="Region">
                    {isEditing ? (
                      <input
                        id="d-region"
                        className={onboardingInputClass}
                        placeholder="NCR"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                      />
                    ) : (
                      <InfoRow label="" value={region} />
                    )}
                  </FormField>
                  <FormField id="d-city" label="City">
                    {isEditing ? (
                      <input
                        id="d-city"
                        className={onboardingInputClass}
                        placeholder="Makati"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    ) : (
                      <InfoRow label="" value={city} />
                    )}
                  </FormField>
                </div>
              </div>

            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
