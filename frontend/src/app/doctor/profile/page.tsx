"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { isValidPrc, isValidPtr } from "@/lib/format";
import { DoctorIdentityCard } from "@/components/doctor-profile/identity-card";
import { PracticeDetailsCard } from "@/components/doctor-profile/practice-details-card";
import { CredentialsLocationCard } from "@/components/doctor-profile/credentials-location-card";

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

  async function handleSubmit(e: FormEvent) {
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
              <DoctorIdentityCard
                isEditing={isEditing}
                profilePictureUrl={profilePictureUrl}
                setProfilePictureUrl={setProfilePictureUrl}
                fullName={fullName}
                setFullName={setFullName}
                professionalTitle={professionalTitle}
                setProfessionalTitle={setProfessionalTitle}
                specialization={specialization}
                bio={bio}
                setBio={setBio}
              />
              <PracticeDetailsCard
                isEditing={isEditing}
                specialization={specialization}
                setSpecialization={setSpecialization}
                yearsOfExperience={yearsOfExperience}
                setYearsOfExperience={setYearsOfExperience}
                consultationFee={consultationFee}
                setConsultationFee={setConsultationFee}
                availabilitySummary={availabilitySummary}
                setAvailabilitySummary={setAvailabilitySummary}
                languagesSpoken={languagesSpoken}
                setLanguagesSpoken={setLanguagesSpoken}
                consultationFocusAreas={consultationFocusAreas}
                setConsultationFocusAreas={setConsultationFocusAreas}
              />
              <CredentialsLocationCard
                isEditing={isEditing}
                prcLicenseNo={prcLicenseNo}
                setPrcLicenseNo={setPrcLicenseNo}
                prcLicenseExpiry={prcLicenseExpiry}
                setPrcLicenseExpiry={setPrcLicenseExpiry}
                ptrNo={ptrNo}
                setPtrNo={setPtrNo}
                region={region}
                setRegion={setRegion}
                city={city}
                setCity={setCity}
              />
            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
