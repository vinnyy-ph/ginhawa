"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { isValidPhilHealth, isValidHmoCard } from "@/lib/format";
import { toItems } from "@/components/profile/profile-fields";
import { IdentityCard } from "@/components/profile/identity-card";
import { LocationInsuranceCard } from "@/components/profile/location-insurance-card";
import { MedicalHistoryCard } from "@/components/profile/medical-history-card";
import type { PatientProfile } from "@/types/patient";

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

  async function handleSubmit(e: FormEvent) {
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
              <IdentityCard
                isEditing={isEditing}
                profilePictureUrl={profilePictureUrl}
                setProfilePictureUrl={setProfilePictureUrl}
                fullName={fullName}
                setFullName={setFullName}
                birthdate={birthdate}
                setBirthdate={setBirthdate}
                contactDigits={contactDigits}
                setContactDigits={setContactDigits}
                weight={weight}
                setWeight={setWeight}
                height={height}
                setHeight={setHeight}
              />
              <LocationInsuranceCard
                isEditing={isEditing}
                address={address}
                setAddress={setAddress}
                city={city}
                setCity={setCity}
                region={region}
                setRegion={setRegion}
                philhealthId={philhealthId}
                setPhilhealthId={setPhilhealthId}
                hmoProvider={hmoProvider}
                setHmoProvider={setHmoProvider}
                hmoCardNo={hmoCardNo}
                setHmoCardNo={setHmoCardNo}
              />
              <MedicalHistoryCard
                isEditing={isEditing}
                bloodType={bloodType}
                setBloodType={setBloodType}
                smokingStatus={smokingStatus}
                setSmokingStatus={setSmokingStatus}
                allergies={allergies}
                setAllergies={setAllergies}
                chronicConditions={chronicConditions}
                setChronicConditions={setChronicConditions}
                currentMedications={currentMedications}
                setCurrentMedications={setCurrentMedications}
                pastSurgeries={pastSurgeries}
                setPastSurgeries={setPastSurgeries}
                familyHistory={familyHistory}
                setFamilyHistory={setFamilyHistory}
              />
            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
