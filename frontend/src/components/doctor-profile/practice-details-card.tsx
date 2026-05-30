/**
 * PracticeDetailsCard — editable card for a doctor's clinical and availability information.
 *
 * Part of the doctor profile edit page. Covers specialization (dropdown from API
 * or plain text fallback if fetch failed), years of experience, consultation fee,
 * availability summary text, languages spoken (quick-select chips + free text),
 * and consultation focus areas (free-text textarea rendered as tag chips in
 * read-only mode). Toggles between edit and read-only display via `isEditing`.
 */

import { FormField } from "@/components/ui/form-field";
import { Chip } from "@/components/ui/chip";
import { useSpecializations } from "@/hooks/use-specializations";
import { onboardingInputClass, onboardingTextareaClass } from "@/components/ui/onboarding-styles";
import { Empty, InfoRow, toItems, toggleChip } from "@/components/profile/profile-fields";
import type { DoctorProfileForm, SetDoctorField } from "@/hooks/use-doctor-profile-form";

const COMMON_LANGUAGES = ["English", "Tagalog", "Cebuano", "Ilocano"];

interface PracticeDetailsCardProps {
  isEditing: boolean;
  values: DoctorProfileForm;
  setField: SetDoctorField;
}

export function PracticeDetailsCard({ isEditing, values, setField }: PracticeDetailsCardProps) {
  const {
    specialization, yearsOfExperience, consultationFee,
    availabilitySummary, languagesSpoken, consultationFocusAreas,
  } = values;

  const { specializations, loading: specsLoading } = useSpecializations();

  // If the doctor has a saved specialization not in the fetched list, prepend it
  // so it remains selectable without clearing the existing value on save.
  const specOptions =
    specialization && !specializations.includes(specialization)
      ? [specialization, ...specializations]
      : specializations;
  // Fall back to a plain text input when the specializations API returns nothing.
  const specFetchFailed = !specsLoading && specializations.length === 0;

  return (
    <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6 flex flex-col gap-6">
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-manrope">
        Practice Details
      </p>

      {/* Specialization + Years */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="d-spec" label="Primary specialization">
          {isEditing ? (
            specFetchFailed ? (
              <input
                id="d-spec"
                className={onboardingInputClass}
                placeholder="e.g. Cardiology"
                value={specialization}
                onChange={(e) => setField("specialization", e.target.value)}
              />
            ) : (
              <select
                id="d-spec"
                className={onboardingInputClass}
                value={specialization}
                onChange={(e) => setField("specialization", e.target.value)}
              >
                <option value="" disabled>
                  {specsLoading ? "Loading…" : "Select specialization"}
                </option>
                {specOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )
          ) : (
            <InfoRow label="" value={specialization} />
          )}
        </FormField>
        <FormField id="d-years" label="Years of experience">
          {isEditing ? (
            <input
              id="d-years"
              type="number"
              min="0"
              className={onboardingInputClass}
              placeholder="0"
              value={yearsOfExperience}
              onChange={(e) => setField("yearsOfExperience", e.target.value)}
            />
          ) : (
            <InfoRow label="" value={yearsOfExperience ? `${yearsOfExperience} ${Number(yearsOfExperience) === 1 ? "year" : "years"}` : ""} />
          )}
        </FormField>
      </div>

      {/* Fee + Availability */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="d-fee" label="Consultation fee (₱)">
          {isEditing ? (
            <input
              id="d-fee"
              type="number"
              min="0"
              step="50"
              className={onboardingInputClass}
              placeholder="500"
              value={consultationFee}
              onChange={(e) => setField("consultationFee", e.target.value)}
            />
          ) : (
            <InfoRow label="" value={consultationFee ? `₱${Number(consultationFee).toLocaleString()}` : ""} />
          )}
        </FormField>
        <FormField id="d-avail" label="Availability">
          {isEditing ? (
            <input
              id="d-avail"
              className={onboardingInputClass}
              placeholder="Weekdays 9 AM – 5 PM"
              value={availabilitySummary}
              onChange={(e) => setField("availabilitySummary", e.target.value)}
            />
          ) : (
            <InfoRow label="" value={availabilitySummary} />
          )}
        </FormField>
      </div>

      {/* Languages */}
      <FormField
        id="d-langs"
        label="Languages spoken"
        hint={isEditing ? "Tap a chip or type your own, comma-separated" : undefined}
      >
        {isEditing ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {COMMON_LANGUAGES.map((v) => (
                <Chip
                  key={v}
                  selected={toItems(languagesSpoken).includes(v)}
                  onClick={() => toggleChip(v, languagesSpoken, (next) => setField("languagesSpoken", next))}
                >
                  {v}
                </Chip>
              ))}
            </div>
            <input
              id="d-langs"
              className={onboardingInputClass}
              placeholder="English, Tagalog"
              value={languagesSpoken}
              onChange={(e) => setField("languagesSpoken", e.target.value)}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 py-1">
            {toItems(languagesSpoken).length > 0
              ? toItems(languagesSpoken).map((lang) => (
                <span
                  key={lang}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-variant text-on-surface-variant font-manrope"
                >
                  {lang}
                </span>
              ))
              : <Empty />
            }
          </div>
        )}
      </FormField>

      {/* Focus Areas */}
      <FormField id="d-focus" label="Focus areas">
        {isEditing ? (
          <textarea
            id="d-focus"
            className={onboardingTextareaClass}
            placeholder="Hypertension management, Preventive cardiology, Cardiac rehabilitation…"
            value={consultationFocusAreas}
            onChange={(e) => setField("consultationFocusAreas", e.target.value)}
          />
        ) : (
          <div className="flex flex-wrap gap-2 py-1">
            {toItems(consultationFocusAreas).length > 0
              ? toItems(consultationFocusAreas).map((area) => (
                <span
                  key={area}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/8 text-primary font-manrope border border-primary/20"
                >
                  {area}
                </span>
              ))
              : <Empty />
            }
          </div>
        )}
      </FormField>
    </div>
  );
}
