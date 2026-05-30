/**
 * Hook for the patient profile edit form. Thin wrapper around
 * `useEditableResource` with patient-specific load/save logic. Profile data
 * and medical history are stored in separate API resources (`/patients/profile`
 * and `/patients/medical-history`) and are saved in sequence — a distinct
 * error is raised if only the medical-history write fails so the user knows
 * their core details were still persisted. PhilHealth ID and HMO card number
 * are validated before any network call is attempted. Array-valued fields
 * (allergies, chronicConditions, currentMedications) are kept as
 * comma-separated strings in the form and converted via `toItems` on save.
 */
import { apiRequest } from "@/lib/api-client";
import { isValidPhilHealth, isValidHmoCard } from "@/lib/format";
import { toItems } from "@/components/profile/profile-fields";
import { useEditableResource } from "@/hooks/use-editable-resource";
import type { PatientProfile } from "@/types/patient-profile";

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

async function loadProfile(token: string): Promise<PatientProfileForm> {
  const d = await apiRequest<PatientProfile>("/patients/profile", { token });
  const m = d.medicalHistoryRecord;
  return {
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
  };
}

async function saveProfile(values: PatientProfileForm, token: string): Promise<void> {
  if (values.philhealthId && !isValidPhilHealth(values.philhealthId)) {
    throw new Error("Enter the full 12-digit PhilHealth ID, or leave it blank.");
  }
  if (values.hmoCardNo && !isValidHmoCard(values.hmoCardNo)) {
    throw new Error("Enter the full 12-character HMO card number, or leave it blank.");
  }

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
  } catch {
    throw new Error("Failed to save profile. Please try again.");
  }

  try {
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
  } catch {
    throw new Error("Saved your details, but medical history failed to save. Please try again.");
  }
}

/**
 * Loads and manages editable state for the authenticated patient's profile
 * and medical history. Exposes the same shape as `useEditableResource` but
 * renames `submit` to `save` for semantic clarity at the call site.
 *
 * @returns Form values, `setField`, edit lifecycle controls (`beginEdit`,
 *   `discard`, `save`), and `loading` / `saving` / `error` / `success` flags.
 */
export function usePatientProfileForm() {
  const { submit, ...rest } = useEditableResource<PatientProfileForm>({
    emptyValues: EMPTY_FORM,
    load: loadProfile,
    save: saveProfile,
    loadErrorMessage: "Failed to load profile.",
  });
  return { ...rest, save: submit };
}
