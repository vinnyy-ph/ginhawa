import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { apiRequest } from "@/lib/api-client";
import { isValidPrc, isValidPtr } from "@/lib/format";

export interface DoctorProfileForm {
  fullName: string; professionalTitle: string; profilePictureUrl: string | null;
  prcLicenseNo: string; prcLicenseExpiry: string; ptrNo: string;
  region: string; city: string; specialization: string;
  yearsOfExperience: string; languagesSpoken: string; bio: string;
  consultationFocusAreas: string; consultationFee: string; availabilitySummary: string;
}

export type SetDoctorField = <K extends keyof DoctorProfileForm>(
  key: K,
  value: DoctorProfileForm[K],
) => void;

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

const EMPTY_FORM: DoctorProfileForm = {
  fullName: "", professionalTitle: "", profilePictureUrl: null,
  prcLicenseNo: "", prcLicenseExpiry: "", ptrNo: "", region: "", city: "",
  specialization: "", yearsOfExperience: "", languagesSpoken: "", bio: "",
  consultationFocusAreas: "", consultationFee: "", availabilitySummary: "",
};

/**
 * Owns the full doctor-profile form lifecycle (load, edit/discard snapshot,
 * validate, save). Cards receive `values` + `setField` and read their slice.
 */
export function useDoctorProfileForm() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [values, setValues] = useState<DoctorProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<DoctorProfileForm | null>(null);

  const setField = useCallback<SetDoctorField>((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (!token) return;
    apiRequest<DoctorProfileData>("/doctors/profile", { token })
      .then((d) => {
        setValues({
          fullName: d.fullName ?? "",
          professionalTitle: d.professionalTitle ?? "",
          profilePictureUrl: d.profilePictureUrl ?? null,
          prcLicenseNo: d.prcLicenseNo ?? "",
          prcLicenseExpiry: d.prcLicenseExpiry ? d.prcLicenseExpiry.split("T")[0] : "",
          ptrNo: d.ptrNo ?? "",
          region: d.region ?? "",
          city: d.city ?? "",
          specialization: d.specialization ?? "",
          yearsOfExperience: d.yearsOfExperience != null ? String(d.yearsOfExperience) : "",
          languagesSpoken: d.languagesSpoken?.join(", ") ?? "",
          bio: d.bio ?? "",
          consultationFocusAreas: d.consultationFocusAreas ?? "",
          consultationFee: d.consultationFee != null ? String(d.consultationFee) : "",
          availabilitySummary: d.availabilitySummary ?? "",
        });
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [token]);

  function beginEdit() {
    setSnapshot(values);
    setIsEditing(true);
    setError(null);
  }

  function discard() {
    if (snapshot) setValues(snapshot);
    setIsEditing(false);
    setError(null);
    setSnapshot(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!token || !isEditing) return;

    if (values.prcLicenseNo && !isValidPrc(values.prcLicenseNo)) {
      setError("PRC license number must be 7 digits, or leave it blank.");
      return;
    }
    if (values.ptrNo && !isValidPtr(values.ptrNo)) {
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
          fullName: values.fullName.trim() || undefined,
          professionalTitle: values.professionalTitle.trim() || undefined,
          profilePictureUrl: values.profilePictureUrl || undefined,
          prcLicenseNo: values.prcLicenseNo.trim() || undefined,
          prcLicenseExpiry: values.prcLicenseExpiry || undefined,
          ptrNo: values.ptrNo.trim() || undefined,
          region: values.region.trim() || undefined,
          city: values.city.trim() || undefined,
          specialization: values.specialization.trim() || undefined,
          yearsOfExperience: values.yearsOfExperience ? Number(values.yearsOfExperience) : undefined,
          languagesSpoken: values.languagesSpoken.trim()
            ? values.languagesSpoken.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          bio: values.bio.trim() || undefined,
          consultationFocusAreas: values.consultationFocusAreas.trim() || undefined,
          consultationFee: values.consultationFee ? Number(values.consultationFee) : undefined,
          availabilitySummary: values.availabilitySummary.trim() || undefined,
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

  return { values, setField, isEditing, loading, saving, error, success, beginEdit, discard, save };
}
