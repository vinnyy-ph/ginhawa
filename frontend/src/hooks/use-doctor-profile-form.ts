/**
 * Hook for the doctor profile edit form. Thin wrapper around
 * `useEditableResource` that supplies the doctor-specific load/save functions
 * and the form shape. Validation (PRC licence, PTR number) is enforced inside
 * `saveProfile` so errors propagate as user-visible messages via the generic
 * controller. Numeric API fields (yearsOfExperience, consultationFee) are
 * stored as strings in the form to keep all inputs uniform, and converted on
 * save. `languagesSpoken` is handled as a comma-separated string and split
 * into an array before sending to the API.
 */
import { apiRequest } from "@/lib/api-client";
import { isValidPrc, isValidPtr } from "@/lib/format";
import { useEditableResource } from "@/hooks/use-editable-resource";

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

async function loadProfile(token: string): Promise<DoctorProfileForm> {
  const d = await apiRequest<DoctorProfileData>("/doctors/profile", { token });
  return {
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
  };
}

async function saveProfile(values: DoctorProfileForm, token: string): Promise<void> {
  if (values.prcLicenseNo && !isValidPrc(values.prcLicenseNo)) {
    throw new Error("PRC license number must be 7 digits, or leave it blank.");
  }
  if (values.ptrNo && !isValidPtr(values.ptrNo)) {
    throw new Error("PTR number must be 7–8 digits, or leave it blank.");
  }

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
  } catch {
    throw new Error("Failed to save profile. Please try again.");
  }
}

/**
 * Loads and manages editable state for the authenticated doctor's profile.
 * Exposes the same shape as `useEditableResource` but renames `submit` to
 * `save` for semantic clarity at the call site.
 *
 * @returns Form values, `setField`, edit lifecycle controls (`beginEdit`,
 *   `discard`, `save`), and `loading` / `saving` / `error` / `success` flags.
 */
export function useDoctorProfileForm() {
  const { submit, ...rest } = useEditableResource<DoctorProfileForm>({
    emptyValues: EMPTY_FORM,
    load: loadProfile,
    save: saveProfile,
    loadErrorMessage: "Failed to load profile.",
  });
  return { ...rest, save: submit };
}
