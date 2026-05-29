"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { PhoneInput } from "@/components/ui/phone-input";
import { Chip } from "@/components/ui/chip";
import { ProfilePhotoField } from "@/components/ui/profile-photo-field";
import { DatePicker } from "@/components/ui/date-picker";
import { localTodayISO } from "@/lib/schemas/onboarding.schemas";
import {
  onboardingInputClass,
  onboardingTextareaClass,
} from "@/lib/onboarding-styles";
import {
  formatPhone,
  formatPhilHealth,
  formatHmoCard,
  isValidPhilHealth,
  isValidHmoCard,
} from "@/lib/format";
import type { PatientProfile } from "@/types/patient";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const SMOKING_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "Never", label: "Never" },
  { value: "Former", label: "Former" },
  { value: "Current", label: "Current" },
];
const COMMON_ALLERGIES = ["Penicillin", "Seafood", "Peanuts", "Aspirin"];
const COMMON_CONDITIONS = ["Hypertension", "Diabetes", "Asthma", "High Cholesterol"];
const COMMON_MEDICATIONS = ["Metformin", "Amlodipine", "Losartan", "Salbutamol"];

const toItems = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function Empty() {
  return <span className="text-on-surface-variant/40 italic text-sm">Not set</span>;
}

/** Muted label + value pair for read-only stat cells */
function StatCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60 font-manrope">
        {label}
      </span>
      <span className="text-sm font-semibold text-text-primary font-manrope">
        {value?.trim() ? value : <Empty />}
      </span>
    </div>
  );
}

/** Generic read-only labelled row */
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

/** Pill tags for lists (allergies, conditions, meds, languages) */
function PillList({ items, color = "neutral" }: { items: string[]; color?: "neutral" | "primary" | "warning" }) {
  if (items.length === 0) return <Empty />;
  const cls =
    color === "primary"
      ? "bg-primary/10 text-primary border border-primary/20"
      : color === "warning"
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-surface-variant text-on-surface-variant border border-outline-variant/50";
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {items.map((item) => (
        <span key={item} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-manrope ${cls}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

interface ProfileSnapshot {
  fullName: string; birthdate: string; contactDigits: string;
  weight: string; height: string; profilePictureUrl: string | null;
  address: string; city: string; region: string;
  philhealthId: string; hmoProvider: string; hmoCardNo: string;
  bloodType: string; smokingStatus: string; allergies: string;
  chronicConditions: string; currentMedications: string;
  pastSurgeries: string; familyHistory: string;
}

export default function PatientProfilePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);

  // Personal
  const [fullName, setFullName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [contactDigits, setContactDigits] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  // Location & insurance
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [philhealthId, setPhilhealthId] = useState("");
  const [hmoProvider, setHmoProvider] = useState("");
  const [hmoCardNo, setHmoCardNo] = useState("");

  // Medical history
  const [bloodType, setBloodType] = useState("");
  const [smokingStatus, setSmokingStatus] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [pastSurgeries, setPastSurgeries] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");

  useEffect(() => {
    if (!token) return;
    apiRequest<PatientProfile>("/patients/profile", { token })
      .then((d) => {
        setFullName(d.fullName ?? "");
        setBirthdate(d.birthdate ? d.birthdate.split("T")[0] : "");
        setContactDigits((d.contactDetails ?? "").replace(/\D/g, "").replace(/^0/, "").slice(0, 10));
        setWeight(d.weight != null ? String(d.weight) : "");
        setHeight(d.height != null ? String(d.height) : "");
        setProfilePictureUrl(d.profilePictureUrl ?? null);
        setAddress(d.address ?? "");
        setCity(d.city ?? "");
        setRegion(d.region ?? "");
        setPhilhealthId(d.philhealthId ?? "");
        setHmoProvider(d.hmoProvider ?? "");
        setHmoCardNo(d.hmoCardNo ?? "");
        const m = d.medicalHistoryRecord;
        setBloodType(m?.bloodType ?? "");
        setSmokingStatus(m?.smokingStatus ?? "");
        setAllergies((m?.allergies ?? []).join(", "));
        setChronicConditions((m?.chronicConditions ?? []).join(", "));
        setCurrentMedications((m?.currentMedications ?? []).join(", "));
        setPastSurgeries(m?.pastSurgeries ?? "");
        setFamilyHistory(m?.familyHistory ?? "");
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [token]);

  const bmi = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || h <= 0) return null;
    const m = h / 100;
    return Math.round((w / (m * m)) * 10) / 10;
  }, [weight, height]);

  const bmiCategory = useMemo(() => {
    if (bmi === null) return null;
    if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500" };
    if (bmi < 25) return { label: "Normal", color: "text-emerald-500" };
    if (bmi < 30) return { label: "Overweight", color: "text-amber-500" };
    return { label: "Obese", color: "text-red-500" };
  }, [bmi]);

  const toggleChip = (value: string, current: string, setter: (v: string) => void) => {
    const items = toItems(current);
    const next = items.includes(value) ? items.filter((i) => i !== value) : [...items, value];
    setter(next.join(", "));
  };

  function handleEditClick() {
    setSnapshot({
      fullName, birthdate, contactDigits, weight, height, profilePictureUrl,
      address, city, region, philhealthId, hmoProvider, hmoCardNo,
      bloodType, smokingStatus, allergies, chronicConditions, currentMedications,
      pastSurgeries, familyHistory,
    });
    setIsEditing(true);
    setError(null);
  }

  function handleDiscard() {
    if (snapshot) {
      setFullName(snapshot.fullName);
      setBirthdate(snapshot.birthdate);
      setContactDigits(snapshot.contactDigits);
      setWeight(snapshot.weight);
      setHeight(snapshot.height);
      setProfilePictureUrl(snapshot.profilePictureUrl);
      setAddress(snapshot.address);
      setCity(snapshot.city);
      setRegion(snapshot.region);
      setPhilhealthId(snapshot.philhealthId);
      setHmoProvider(snapshot.hmoProvider);
      setHmoCardNo(snapshot.hmoCardNo);
      setBloodType(snapshot.bloodType);
      setSmokingStatus(snapshot.smokingStatus);
      setAllergies(snapshot.allergies);
      setChronicConditions(snapshot.chronicConditions);
      setCurrentMedications(snapshot.currentMedications);
      setPastSurgeries(snapshot.pastSurgeries);
      setFamilyHistory(snapshot.familyHistory);
    }
    setIsEditing(false);
    setError(null);
    setSnapshot(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !isEditing) return;

    if (philhealthId && !isValidPhilHealth(philhealthId)) {
      setError("Enter the full 12-digit PhilHealth ID, or leave it blank.");
      return;
    }
    if (hmoCardNo && !isValidHmoCard(hmoCardNo)) {
      setError("Enter the full 12-character HMO card number, or leave it blank.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);
    let savedDetails = false;
    try {
      await apiRequest("/patients/profile", {
        method: "PATCH",
        token,
        body: {
          fullName: fullName.trim() || undefined,
          birthdate: birthdate || undefined,
          weight: weight ? Number(weight) : undefined,
          height: height ? Number(height) : undefined,
          contactDetails: contactDigits || undefined,
          profilePictureUrl: profilePictureUrl || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          region: region.trim() || undefined,
          philhealthId: philhealthId.trim() || undefined,
          hmoProvider: hmoProvider.trim() || undefined,
          hmoCardNo: hmoCardNo.trim() || undefined,
        },
      });
      savedDetails = true;

      await apiRequest("/patients/medical-history", {
        method: "PATCH",
        token,
        body: {
          bloodType,
          allergies: toItems(allergies),
          chronicConditions: toItems(chronicConditions),
          currentMedications: toItems(currentMedications),
          pastSurgeries: pastSurgeries.trim(),
          familyHistory: familyHistory.trim(),
          smokingStatus,
        },
      });

      setSuccess(true);
      setIsEditing(false);
      setSnapshot(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError(
        savedDetails
          ? "Saved your details, but medical history failed to save. Please try again."
          : "Failed to save profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const smokingLabel = SMOKING_OPTIONS.find((o) => o.value === smokingStatus)?.label ?? smokingStatus;
  const contactDisplay = contactDigits ? `+63 ${formatPhone(contactDigits)}` : "";

  return (
    <DashboardLayout role="patient">
      <div className="animate-in fade-in duration-500">

        {/* ── Page header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Profile</h1>
            <p className="text-on-surface-variant">
              {isEditing ? "Make changes below, then save when you're done." : "Your personal and medical information."}
            </p>
          </div>
          {isEditing ? (
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={handleDiscard} disabled={saving}>
                Discard Changes
              </Button>
              <Button type="submit" form="patient-profile-form" disabled={saving} className="min-w-[140px]">
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

            <form id="patient-profile-form" onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* ══════════════════════════════════
                  CARD 1 — Identity
                  Photo · Name · Birthdate · Contact · Body metrics
              ══════════════════════════════════ */}
              <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
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
                        <FormField id="p-fullName" label="Full name">
                          <input
                            id="p-fullName"
                            className={onboardingInputClass}
                            placeholder="Juan dela Cruz"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                          />
                        </FormField>
                      ) : (
                        <div>
                          <p className="text-2xl font-bold font-serif text-text-primary leading-tight">
                            {fullName || <span className="text-on-surface-variant/40 italic font-normal text-lg">Name not set</span>}
                          </p>
                          {birthdate && (
                            <p className="text-sm text-on-surface-variant font-manrope mt-1">
                              Born {birthdate}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact + Birthdate row (edit only) or quick stats (view only) */}
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField id="p-birthdate" label="Date of birth">
                        <DatePicker id="p-birthdate" value={birthdate} onChange={setBirthdate} maxDate={localTodayISO()} />
                      </FormField>
                      <FormField id="p-contact" label="Contact number">
                        <PhoneInput
                          placeholder="917 123 4567"
                          value={formatPhone(contactDigits)}
                          onChange={(e) =>
                            setContactDigits(e.target.value.replace(/\D/g, "").replace(/^0/, "").slice(0, 10))
                          }
                        />
                      </FormField>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                      <StatCell label="Contact" value={contactDisplay} />
                      <StatCell label="Date of Birth" value={birthdate} />
                      <StatCell label="Weight" value={weight ? `${weight} kg` : null} />
                      <StatCell label="Height" value={height ? `${height} cm` : null} />
                    </div>
                  )}

                  {/* Body metrics (edit mode) + BMI */}
                  {isEditing && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField id="p-weight" label="Weight (kg)">
                        <input
                          id="p-weight"
                          type="number"
                          min="0"
                          step="0.1"
                          className={onboardingInputClass}
                          placeholder="65"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                        />
                      </FormField>
                      <FormField id="p-height" label="Height (cm)">
                        <input
                          id="p-height"
                          type="number"
                          min="0"
                          step="0.1"
                          className={onboardingInputClass}
                          placeholder="170"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                        />
                      </FormField>
                    </div>
                  )}

                  {/* BMI display */}
                  {bmi !== null && (
                    <div className="border-t border-outline-variant/20 pt-4 flex items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60 font-manrope">
                          Estimated BMI
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-text-primary font-manrope">{bmi}</span>
                          {bmiCategory && (
                            <span className={`text-sm font-semibold font-manrope ${bmiCategory.color}`}>
                              {bmiCategory.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ══════════════════════════════════
                  CARD 2 — Location & Insurance
              ══════════════════════════════════ */}
              <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6 flex flex-col gap-6">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-manrope">
                  Location &amp; Insurance
                </p>

                {/* Address */}
                <FormField id="p-address" label="Address">
                  {isEditing ? (
                    <input
                      id="p-address"
                      className={onboardingInputClass}
                      placeholder="123 Rizal St., Barangay Poblacion"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  ) : (
                    <InfoRow label="" value={address} />
                  )}
                </FormField>

                {/* City + Region */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="p-city" label="City">
                    {isEditing ? (
                      <input
                        id="p-city"
                        className={onboardingInputClass}
                        placeholder="Makati"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    ) : (
                      <InfoRow label="" value={city} />
                    )}
                  </FormField>
                  <FormField id="p-region" label="Region">
                    {isEditing ? (
                      <input
                        id="p-region"
                        className={onboardingInputClass}
                        placeholder="NCR"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                      />
                    ) : (
                      <InfoRow label="" value={region} />
                    )}
                  </FormField>
                </div>

                <div className="border-t border-outline-variant/20" />

                {/* PhilHealth */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="p-philhealth" label="PhilHealth ID">
                    {isEditing ? (
                      <input
                        id="p-philhealth"
                        inputMode="numeric"
                        placeholder="12-345678901-2"
                        className={onboardingInputClass}
                        value={philhealthId}
                        onChange={(e) => setPhilhealthId(formatPhilHealth(e.target.value))}
                      />
                    ) : (
                      <InfoRow label="" value={philhealthId} />
                    )}
                  </FormField>
                </div>

                {/* HMO Provider + Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="p-hmoProvider" label="HMO Provider">
                    {isEditing ? (
                      <input
                        id="p-hmoProvider"
                        className={onboardingInputClass}
                        placeholder="Maxicare"
                        value={hmoProvider}
                        onChange={(e) => setHmoProvider(e.target.value)}
                      />
                    ) : (
                      <InfoRow label="" value={hmoProvider} />
                    )}
                  </FormField>
                  <FormField id="p-hmoCardNo" label="HMO Card No.">
                    {isEditing ? (
                      <input
                        id="p-hmoCardNo"
                        placeholder="XXXX-XXXX-XXXX"
                        className={onboardingInputClass}
                        value={hmoCardNo}
                        onChange={(e) => setHmoCardNo(formatHmoCard(e.target.value))}
                      />
                    ) : (
                      <InfoRow label="" value={hmoCardNo} />
                    )}
                  </FormField>
                </div>
              </div>

              {/* ══════════════════════════════════
                  CARD 3 — Medical History
              ══════════════════════════════════ */}
              <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6 flex flex-col gap-6">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-manrope">
                  Medical History
                </p>

                {/* Blood type + Smoking */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="p-bloodType" label="Blood type">
                    {isEditing ? (
                      <select
                        id="p-bloodType"
                        className={onboardingInputClass}
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                      </select>
                    ) : (
                      <div className="py-1">
                        {bloodType
                          ? <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-50 text-red-600 border border-red-200 font-manrope">{bloodType}</span>
                          : <Empty />
                        }
                      </div>
                    )}
                  </FormField>
                  <FormField id="p-smoking" label="Smoking status">
                    {isEditing ? (
                      <select
                        id="p-smoking"
                        className={onboardingInputClass}
                        value={smokingStatus}
                        onChange={(e) => setSmokingStatus(e.target.value)}
                      >
                        {SMOKING_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <div className="py-1">
                        {smokingStatus
                          ? <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border font-manrope ${
                              smokingStatus === "Current"
                                ? "bg-red-50 text-red-600 border-red-200"
                                : smokingStatus === "Former"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>{smokingLabel}</span>
                          : <Empty />
                        }
                      </div>
                    )}
                  </FormField>
                </div>

                <div className="border-t border-outline-variant/20" />

                {/* Allergies */}
                <FormField
                  id="p-allergies"
                  label="Allergies"
                  hint={isEditing ? "Tap a suggestion or type your own, separated by commas" : undefined}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-wrap gap-2">
                        {COMMON_ALLERGIES.map((v) => (
                          <Chip key={v} selected={toItems(allergies).includes(v)} onClick={() => toggleChip(v, allergies, setAllergies)}>{v}</Chip>
                        ))}
                      </div>
                      <input
                        id="p-allergies"
                        className={onboardingInputClass}
                        placeholder="Penicillin, Peanuts"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                      />
                    </div>
                  ) : (
                    <PillList items={toItems(allergies)} color="warning" />
                  )}
                </FormField>

                {/* Chronic conditions */}
                <FormField
                  id="p-conditions"
                  label="Chronic conditions"
                  hint={isEditing ? "Tap a suggestion or type your own, separated by commas" : undefined}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-wrap gap-2">
                        {COMMON_CONDITIONS.map((v) => (
                          <Chip key={v} selected={toItems(chronicConditions).includes(v)} onClick={() => toggleChip(v, chronicConditions, setChronicConditions)}>{v}</Chip>
                        ))}
                      </div>
                      <input
                        id="p-conditions"
                        className={onboardingInputClass}
                        placeholder="Hypertension, Asthma"
                        value={chronicConditions}
                        onChange={(e) => setChronicConditions(e.target.value)}
                      />
                    </div>
                  ) : (
                    <PillList items={toItems(chronicConditions)} color="primary" />
                  )}
                </FormField>

                {/* Current medications */}
                <FormField
                  id="p-meds"
                  label="Current medications"
                  hint={isEditing ? "Tap a suggestion or type your own, separated by commas" : undefined}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-wrap gap-2">
                        {COMMON_MEDICATIONS.map((v) => (
                          <Chip key={v} selected={toItems(currentMedications).includes(v)} onClick={() => toggleChip(v, currentMedications, setCurrentMedications)}>{v}</Chip>
                        ))}
                      </div>
                      <input
                        id="p-meds"
                        className={onboardingInputClass}
                        placeholder="Amlodipine 5mg, Metformin"
                        value={currentMedications}
                        onChange={(e) => setCurrentMedications(e.target.value)}
                      />
                    </div>
                  ) : (
                    <PillList items={toItems(currentMedications)} color="neutral" />
                  )}
                </FormField>

                <div className="border-t border-outline-variant/20" />

                {/* Past surgeries + Family history */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField id="p-surgeries" label="Past surgeries">
                    {isEditing ? (
                      <textarea
                        id="p-surgeries"
                        className={onboardingTextareaClass}
                        placeholder="e.g. Appendectomy (2018)"
                        value={pastSurgeries}
                        onChange={(e) => setPastSurgeries(e.target.value)}
                      />
                    ) : (
                      <p className="text-sm text-text-primary font-manrope leading-relaxed py-1">
                        {pastSurgeries?.trim() || <Empty />}
                      </p>
                    )}
                  </FormField>
                  <FormField id="p-family" label="Family history">
                    {isEditing ? (
                      <textarea
                        id="p-family"
                        className={onboardingTextareaClass}
                        placeholder="e.g. Diabetes (mother), Hypertension (father)"
                        value={familyHistory}
                        onChange={(e) => setFamilyHistory(e.target.value)}
                      />
                    ) : (
                      <p className="text-sm text-text-primary font-manrope leading-relaxed py-1">
                        {familyHistory?.trim() || <Empty />}
                      </p>
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
