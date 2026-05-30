import { FormField } from "@/components/ui/form-field";
import { Chip } from "@/components/ui/chip";
import { onboardingInputClass, onboardingTextareaClass } from "@/components/ui/onboarding-styles";
import {
  Empty,
  PillList,
  toItems,
  toggleChip,
  BLOOD_TYPES,
  SMOKING_OPTIONS,
  COMMON_ALLERGIES,
  COMMON_CONDITIONS,
  COMMON_MEDICATIONS,
} from "./profile-fields";
import type { PatientProfileForm, SetProfileField } from "@/hooks/use-patient-profile-form";

interface MedicalHistoryCardProps {
  isEditing: boolean;
  values: PatientProfileForm;
  setField: SetProfileField;
}

export function MedicalHistoryCard({ isEditing, values, setField }: MedicalHistoryCardProps) {
  const {
    bloodType, smokingStatus, allergies, chronicConditions,
    currentMedications, pastSurgeries, familyHistory,
  } = values;

  const smokingLabel = SMOKING_OPTIONS.find((o) => o.value === smokingStatus)?.label ?? smokingStatus;

  return (
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
              onChange={(e) => setField("bloodType", e.target.value)}
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
              onChange={(e) => setField("smokingStatus", e.target.value)}
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
                <Chip key={v} selected={toItems(allergies).includes(v)} onClick={() => toggleChip(v, allergies, (next) => setField("allergies", next))}>{v}</Chip>
              ))}
            </div>
            <input
              id="p-allergies"
              className={onboardingInputClass}
              placeholder="Penicillin, Peanuts"
              value={allergies}
              onChange={(e) => setField("allergies", e.target.value)}
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
                <Chip key={v} selected={toItems(chronicConditions).includes(v)} onClick={() => toggleChip(v, chronicConditions, (next) => setField("chronicConditions", next))}>{v}</Chip>
              ))}
            </div>
            <input
              id="p-conditions"
              className={onboardingInputClass}
              placeholder="Hypertension, Asthma"
              value={chronicConditions}
              onChange={(e) => setField("chronicConditions", e.target.value)}
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
                <Chip key={v} selected={toItems(currentMedications).includes(v)} onClick={() => toggleChip(v, currentMedications, (next) => setField("currentMedications", next))}>{v}</Chip>
              ))}
            </div>
            <input
              id="p-meds"
              className={onboardingInputClass}
              placeholder="Amlodipine 5mg, Metformin"
              value={currentMedications}
              onChange={(e) => setField("currentMedications", e.target.value)}
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
              onChange={(e) => setField("pastSurgeries", e.target.value)}
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
              onChange={(e) => setField("familyHistory", e.target.value)}
            />
          ) : (
            <p className="text-sm text-text-primary font-manrope leading-relaxed py-1">
              {familyHistory?.trim() || <Empty />}
            </p>
          )}
        </FormField>
      </div>
    </div>
  );
}
