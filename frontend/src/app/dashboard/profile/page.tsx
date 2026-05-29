"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircledIcon } from "@radix-ui/react-icons";
import { FormField } from "@/components/ui/form-field";
import { PhoneInput } from "@/components/ui/phone-input";
import { Chip } from "@/components/ui/chip";
import { ProfileSection } from "@/components/ui/profile-section";
import { ProfilePhotoField } from "@/components/ui/profile-photo-field";
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

export default function PatientProfilePage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Personal
  const [fullName, setFullName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [contactDigits, setContactDigits] = useState(""); // raw digits
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

  const toggleChip = (
    value: string,
    current: string,
    setter: (v: string) => void,
  ) => {
    const items = toItems(current);
    const next = items.includes(value)
      ? items.filter((i) => i !== value)
      : [...items, value];
    setter(next.join(", "));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

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

      // Edit semantics: send empty values explicitly so a cleared field is
      // actually cleared server-side (not left unchanged).
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

  return (
    <DashboardLayout role="patient">
      <div className="max-w-2xl animate-in fade-in duration-500">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Profile</h1>
          <p className="text-on-surface-variant">Update your personal, location, and medical information.</p>
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

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              <ProfileSection title="Personal">
                <ProfilePhotoField value={profilePictureUrl} onChange={setProfilePictureUrl} />
                <FormField id="p-fullName" label="Full name">
                  <input id="p-fullName" className={onboardingInputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </FormField>
                <FormField id="p-birthdate" label="Date of birth">
                  <input id="p-birthdate" type="date" className={onboardingInputClass} value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="p-weight" label="Weight (kg)">
                    <input id="p-weight" type="number" min="0" step="0.1" className={onboardingInputClass} value={weight} onChange={(e) => setWeight(e.target.value)} />
                  </FormField>
                  <FormField id="p-height" label="Height (cm)">
                    <input id="p-height" type="number" min="0" step="0.1" className={onboardingInputClass} value={height} onChange={(e) => setHeight(e.target.value)} />
                  </FormField>
                </div>
                {bmi !== null && (
                  <p className="text-xs text-on-surface-variant font-manrope">Estimated BMI: <span className="font-bold text-on-surface">{bmi}</span></p>
                )}
              </ProfileSection>

              <ProfileSection title="Location & Insurance">
                <FormField id="p-address" label="Address">
                  <input id="p-address" className={onboardingInputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="p-city" label="City">
                    <input id="p-city" className={onboardingInputClass} value={city} onChange={(e) => setCity(e.target.value)} />
                  </FormField>
                  <FormField id="p-region" label="Region">
                    <input id="p-region" className={onboardingInputClass} value={region} onChange={(e) => setRegion(e.target.value)} />
                  </FormField>
                </div>
                <FormField id="p-philhealth" label="PhilHealth ID">
                  <input id="p-philhealth" inputMode="numeric" placeholder="12-345678901-2" className={onboardingInputClass} value={philhealthId} onChange={(e) => setPhilhealthId(formatPhilHealth(e.target.value))} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="p-hmoProvider" label="HMO Provider">
                    <input id="p-hmoProvider" className={onboardingInputClass} placeholder="Maxicare" value={hmoProvider} onChange={(e) => setHmoProvider(e.target.value)} />
                  </FormField>
                  <FormField id="p-hmoCardNo" label="HMO Card No.">
                    <input id="p-hmoCardNo" placeholder="XXXX-XXXX-XXXX" className={onboardingInputClass} value={hmoCardNo} onChange={(e) => setHmoCardNo(formatHmoCard(e.target.value))} />
                  </FormField>
                </div>
              </ProfileSection>

              <ProfileSection title="Medical History">
                <div className="grid grid-cols-2 gap-4">
                  <FormField id="p-bloodType" label="Blood type">
                    <select id="p-bloodType" className={onboardingInputClass} value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                      <option value="">Select…</option>
                      {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </FormField>
                  <FormField id="p-smoking" label="Smoking status">
                    <select id="p-smoking" className={onboardingInputClass} value={smokingStatus} onChange={(e) => setSmokingStatus(e.target.value)}>
                      {SMOKING_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField id="p-allergies" label="Allergies" hint="Tap a suggestion or type your own, separated by commas">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      {COMMON_ALLERGIES.map((v) => (
                        <Chip key={v} selected={toItems(allergies).includes(v)} onClick={() => toggleChip(v, allergies, setAllergies)}>{v}</Chip>
                      ))}
                    </div>
                    <input id="p-allergies" className={onboardingInputClass} placeholder="Penicillin, Peanuts" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
                  </div>
                </FormField>
                <FormField id="p-conditions" label="Chronic conditions" hint="Tap a suggestion or type your own, separated by commas">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      {COMMON_CONDITIONS.map((v) => (
                        <Chip key={v} selected={toItems(chronicConditions).includes(v)} onClick={() => toggleChip(v, chronicConditions, setChronicConditions)}>{v}</Chip>
                      ))}
                    </div>
                    <input id="p-conditions" className={onboardingInputClass} placeholder="Hypertension, Asthma" value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} />
                  </div>
                </FormField>
                <FormField id="p-meds" label="Current medications" hint="Tap a suggestion or type your own, separated by commas">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      {COMMON_MEDICATIONS.map((v) => (
                        <Chip key={v} selected={toItems(currentMedications).includes(v)} onClick={() => toggleChip(v, currentMedications, setCurrentMedications)}>{v}</Chip>
                      ))}
                    </div>
                    <input id="p-meds" className={onboardingInputClass} placeholder="Amlodipine 5mg, Metformin" value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} />
                  </div>
                </FormField>
                <FormField id="p-surgeries" label="Past surgeries">
                  <textarea id="p-surgeries" className={onboardingTextareaClass} placeholder="e.g. Appendectomy (2018)" value={pastSurgeries} onChange={(e) => setPastSurgeries(e.target.value)} />
                </FormField>
                <FormField id="p-family" label="Family history">
                  <textarea id="p-family" className={onboardingTextareaClass} placeholder="e.g. Diabetes (mother)" value={familyHistory} onChange={(e) => setFamilyHistory(e.target.value)} />
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
