import { FormField } from "@/components/ui/form-field";
import { Chip } from "@/components/ui/chip";
import { useSpecializations } from "@/hooks/use-specializations";
import { onboardingInputClass, onboardingTextareaClass } from "@/lib/onboarding-styles";
import { Empty, InfoRow, toItems, toggleChip } from "@/components/profile/profile-fields";

const COMMON_LANGUAGES = ["English", "Tagalog", "Cebuano", "Ilocano"];

interface PracticeDetailsCardProps {
  isEditing: boolean;
  specialization: string;
  setSpecialization: (v: string) => void;
  yearsOfExperience: string;
  setYearsOfExperience: (v: string) => void;
  consultationFee: string;
  setConsultationFee: (v: string) => void;
  availabilitySummary: string;
  setAvailabilitySummary: (v: string) => void;
  languagesSpoken: string;
  setLanguagesSpoken: (v: string) => void;
  consultationFocusAreas: string;
  setConsultationFocusAreas: (v: string) => void;
}

export function PracticeDetailsCard({
  isEditing,
  specialization,
  setSpecialization,
  yearsOfExperience,
  setYearsOfExperience,
  consultationFee,
  setConsultationFee,
  availabilitySummary,
  setAvailabilitySummary,
  languagesSpoken,
  setLanguagesSpoken,
  consultationFocusAreas,
  setConsultationFocusAreas,
}: PracticeDetailsCardProps) {
  const { specializations, loading: specsLoading } = useSpecializations();

  const specOptions =
    specialization && !specializations.includes(specialization)
      ? [specialization, ...specializations]
      : specializations;
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
                onChange={(e) => setSpecialization(e.target.value)}
              />
            ) : (
              <select
                id="d-spec"
                className={onboardingInputClass}
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
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
              onChange={(e) => setYearsOfExperience(e.target.value)}
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
              onChange={(e) => setConsultationFee(e.target.value)}
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
              onChange={(e) => setAvailabilitySummary(e.target.value)}
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
                  onClick={() => toggleChip(v, languagesSpoken, setLanguagesSpoken)}
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
              onChange={(e) => setLanguagesSpoken(e.target.value)}
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
            onChange={(e) => setConsultationFocusAreas(e.target.value)}
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
