import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { apiRequest } from "@/lib/api-client";
import { isValidPhilHealth, isValidHmoCard } from "@/lib/format";
import { toItems } from "@/components/profile/profile-fields";
import type { PatientProfile } from "@/types/patient";

export interface PatientProfileForm {
  fullName: string; birthdate: string; contactDigits: string;
  weight: string; height: string; profilePictureUrl: string | null;
  address: string; city: string; region: string;
  philhealthId: string; hmoProvider: string; hmoCardNo: string;
  bloodType: string; smokingStatus: string; allergies: string;
  chronicConditions: string; currentMedications: string;
  pastSurgeries: string; familyHistory: string;
}

export type SetProfileField = <K extends keyof PatientProfileForm>(
  key: K,
  value: PatientProfileForm[K],
) => void;

const EMPTY_FORM: PatientProfileForm = {
  fullName: "", birthdate: "", contactDigits: "", weight: "", height: "", profilePictureUrl: null,
  address: "", city: "", region: "", philhealthId: "", hmoProvider: "", hmoCardNo: "",
  bloodType: "", smokingStatus: "", allergies: "", chronicConditions: "", currentMedications: "",
  pastSurgeries: "", familyHistory: "",
};

/**
 * Owns the full patient-profile form lifecycle (load, edit/discard snapshot,
 * validate, save) so the page and cards stay presentational. Cards receive
 * `values` + `setField` and read only the slice they render.
 */
export function usePatientProfileForm() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken;

  const [values, setValues] = useState<PatientProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<PatientProfileForm | null>(null);

  const setField = useCallback<SetProfileField>((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (!token) return;
    apiRequest<PatientProfile>("/patients/profile", { token })
      .then((d) => {
        const m = d.medicalHistoryRecord;
        setValues({
          fullName: d.fullName ?? "",
          birthdate: d.birthdate ? d.birthdate.split("T")[0] : "",
          contactDigits: (d.contactDetails ?? "").replace(/\D/g, "").replace(/^0/, "").slice(0, 10),
          weight: d.weight != null ? String(d.weight) : "",
          height: d.height != null ? String(d.height) : "",
          profilePictureUrl: d.profilePictureUrl ?? null,
          address: d.address ?? "",
          city: d.city ?? "",
          region: d.region ?? "",
          philhealthId: d.philhealthId ?? "",
          hmoProvider: d.hmoProvider ?? "",
          hmoCardNo: d.hmoCardNo ?? "",
          bloodType: m?.bloodType ?? "",
          smokingStatus: m?.smokingStatus ?? "",
          allergies: (m?.allergies ?? []).join(", "),
          chronicConditions: (m?.chronicConditions ?? []).join(", "),
          currentMedications: (m?.currentMedications ?? []).join(", "),
          pastSurgeries: m?.pastSurgeries ?? "",
          familyHistory: m?.familyHistory ?? "",
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

    if (values.philhealthId && !isValidPhilHealth(values.philhealthId)) {
      setError("Enter the full 12-digit PhilHealth ID, or leave it blank.");
      return;
    }
    if (values.hmoCardNo && !isValidHmoCard(values.hmoCardNo)) {
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
          fullName: values.fullName.trim() || undefined,
          birthdate: values.birthdate || undefined,
          weight: values.weight ? Number(values.weight) : undefined,
          height: values.height ? Number(values.height) : undefined,
          contactDetails: values.contactDigits || undefined,
          profilePictureUrl: values.profilePictureUrl || undefined,
          address: values.address.trim() || undefined,
          city: values.city.trim() || undefined,
          region: values.region.trim() || undefined,
          philhealthId: values.philhealthId.trim() || undefined,
          hmoProvider: values.hmoProvider.trim() || undefined,
          hmoCardNo: values.hmoCardNo.trim() || undefined,
        },
      });
      savedDetails = true;

      await apiRequest("/patients/medical-history", {
        method: "PATCH",
        token,
        body: {
          bloodType: values.bloodType,
          allergies: toItems(values.allergies),
          chronicConditions: toItems(values.chronicConditions),
          currentMedications: toItems(values.currentMedications),
          pastSurgeries: values.pastSurgeries.trim(),
          familyHistory: values.familyHistory.trim(),
          smokingStatus: values.smokingStatus,
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

  return { values, setField, isEditing, loading, saving, error, success, beginEdit, discard, save };
}
