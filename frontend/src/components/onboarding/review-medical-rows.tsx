/**
 * ReviewMedicalRows — patient onboarding, review step (shared sub-component).
 *
 * Renders the optional medical history fields (blood type, smoking status,
 * allergies, chronic conditions, medications, past surgeries, family history)
 * as inline-editable rows inside the patient review card. Returns null when
 * no medical data was entered, matching the same guard pattern used by
 * ReviewLocationInsuranceRows.
 */
import type { OnboardingData } from "@/types/patient-profile";
import { EditableRow, editInputClass } from "@/components/ui/editable-row";
import { cn } from "@/lib/utils";

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const SMOKING_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Never', label: 'Never' },
  { value: 'Former', label: 'Former' },
  { value: 'Current', label: 'Current' },
];

interface Props {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
}

/**
 * Conditionally renders medical history rows inside the patient review card.
 * Past surgeries and family history rows are additionally suppressed when
 * their individual values are empty, keeping the card tidy for partial entries.
 */
export function ReviewMedicalRows({ data, update }: Props) {
  // Guard: suppress the entire section when the patient skipped all medical fields.
  const hasMedical =
    !!(data.bloodType || data.allergies || data.chronicConditions || data.currentMedications ||
       data.pastSurgeries || data.familyHistory || data.smokingStatus);
  if (!hasMedical) return null;

  return (
    <>
      <div className="col-span-full h-px bg-outline-variant/30" />
      <EditableRow
        label="Blood Type"
        display={data.bloodType}
        initial={{ bloodType: data.bloodType }}
        onSave={update}
        render={(d, set) => (
          <select className={editInputClass} value={d.bloodType} onChange={(e) => set('bloodType', e.target.value)}>
            <option value="">Select…</option>
            {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        )}
      />
      <EditableRow
        label="Smoking"
        display={data.smokingStatus}
        initial={{ smokingStatus: data.smokingStatus }}
        onSave={update}
        render={(d, set) => (
          <select className={editInputClass} value={d.smokingStatus} onChange={(e) => set('smokingStatus', e.target.value)}>
            {SMOKING_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
          </select>
        )}
      />
      <EditableRow
        fullWidth
        label="Allergies"
        display={data.allergies}
        initial={{ allergies: data.allergies }}
        onSave={update}
        render={(d, set) => (
          <input className={editInputClass} placeholder="Comma-separated" value={d.allergies} onChange={(e) => set('allergies', e.target.value)} />
        )}
      />
      <EditableRow
        fullWidth
        label="Chronic Conditions"
        display={data.chronicConditions}
        initial={{ chronicConditions: data.chronicConditions }}
        onSave={update}
        render={(d, set) => (
          <input className={editInputClass} placeholder="Comma-separated" value={d.chronicConditions} onChange={(e) => set('chronicConditions', e.target.value)} />
        )}
      />
      <EditableRow
        fullWidth
        label="Current Medications"
        display={data.currentMedications}
        initial={{ currentMedications: data.currentMedications }}
        onSave={update}
        render={(d, set) => (
          <input className={editInputClass} placeholder="Comma-separated" value={d.currentMedications} onChange={(e) => set('currentMedications', e.target.value)} />
        )}
      />
      {data.pastSurgeries && (
        <EditableRow
          fullWidth
          label="Past Surgeries"
          display={data.pastSurgeries}
          initial={{ pastSurgeries: data.pastSurgeries }}
          onSave={update}
          render={(d, set) => (
            <textarea className={cn(editInputClass, 'resize-y min-h-[60px]')} value={d.pastSurgeries} onChange={(e) => set('pastSurgeries', e.target.value)} />
          )}
        />
      )}
      {data.familyHistory && (
        <EditableRow
          fullWidth
          label="Family History"
          display={data.familyHistory}
          initial={{ familyHistory: data.familyHistory }}
          onSave={update}
          render={(d, set) => (
            <textarea className={cn(editInputClass, 'resize-y min-h-[60px]')} value={d.familyHistory} onChange={(e) => set('familyHistory', e.target.value)} />
          )}
        />
      )}
    </>
  );
}
