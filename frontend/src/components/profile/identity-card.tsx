import { useMemo } from "react";
import { FormField } from "@/components/ui/form-field";
import { PhoneInput } from "@/components/ui/phone-input";
import { ProfilePhotoField } from "@/components/ui/profile-photo-field";
import { DatePicker } from "@/components/ui/date-picker";
import { localTodayISO } from "@/lib/schemas/onboarding.schemas";
import { onboardingInputClass } from "@/lib/onboarding-styles";
import { formatPhone } from "@/lib/format";
import { StatCell } from "./profile-fields";

interface IdentityCardProps {
  isEditing: boolean;
  profilePictureUrl: string | null;
  setProfilePictureUrl: (v: string | null) => void;
  fullName: string;
  setFullName: (v: string) => void;
  birthdate: string;
  setBirthdate: (v: string) => void;
  contactDigits: string;
  setContactDigits: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  height: string;
  setHeight: (v: string) => void;
}

export function IdentityCard({
  isEditing,
  profilePictureUrl,
  setProfilePictureUrl,
  fullName,
  setFullName,
  birthdate,
  setBirthdate,
  contactDigits,
  setContactDigits,
  weight,
  setWeight,
  height,
  setHeight,
}: IdentityCardProps) {
  const bmi = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || h <= 0) return null;
    const m = h / 100;
    return Math.round((w / (m * m)) * 10) / 10;
  }, [weight, height]);

  const bmiCategory = useMemo(() => {
    if (bmi === null) return null;
    if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500" };
    if (bmi < 25) return { label: "Normal", color: "text-emerald-500" };
    if (bmi < 30) return { label: "Overweight", color: "text-amber-500" };
    return { label: "Obese", color: "text-red-500" };
  }, [bmi]);

  const contactDisplay = contactDigits ? `+63 ${formatPhone(contactDigits)}` : "";

  return (
    <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-brand-light to-brand" />

      <div className="p-6 flex flex-col gap-6">
        {/* Photo + name row */}
        <div className="flex items-start gap-6">
          <ProfilePhotoField
            value={profilePictureUrl}
            onChange={setProfilePictureUrl}
            readOnly={!isEditing}
          />
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {isEditing ? (
              <FormField id="p-fullName" label="Full name">
                <input
                  id="p-fullName"
                  className={onboardingInputClass}
                  placeholder="Juan dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </FormField>
            ) : (
              <div>
                <p className="text-2xl font-bold font-serif text-text-primary leading-tight">
                  {fullName || <span className="text-on-surface-variant/40 italic font-normal text-lg">Name not set</span>}
                </p>
                {birthdate && (
                  <p className="text-sm text-on-surface-variant font-manrope mt-1">
                    Born {birthdate}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contact + Birthdate row (edit only) or quick stats (view only) */}
        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="p-birthdate" label="Date of birth">
              <DatePicker id="p-birthdate" value={birthdate} onChange={setBirthdate} maxDate={localTodayISO()} />
            </FormField>
            <FormField id="p-contact" label="Contact number">
              <PhoneInput
                placeholder="917 123 4567"
                value={formatPhone(contactDigits)}
                onChange={(e) =>
                  setContactDigits(e.target.value.replace(/\D/g, "").replace(/^0/, "").slice(0, 10))
                }
              />
            </FormField>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <StatCell label="Contact" value={contactDisplay} />
            <StatCell label="Date of Birth" value={birthdate} />
            <StatCell label="Weight" value={weight ? `${weight} kg` : null} />
            <StatCell label="Height" value={height ? `${height} cm` : null} />
          </div>
        )}

        {/* Body metrics (edit mode) + BMI */}
        {isEditing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="p-weight" label="Weight (kg)">
              <input
                id="p-weight"
                type="number"
                min="0"
                step="0.1"
                className={onboardingInputClass}
                placeholder="65"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </FormField>
            <FormField id="p-height" label="Height (cm)">
              <input
                id="p-height"
                type="number"
                min="0"
                step="0.1"
                className={onboardingInputClass}
                placeholder="170"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </FormField>
          </div>
        )}

        {/* BMI display */}
        {bmi !== null && (
          <div className="border-t border-outline-variant/20 pt-4 flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/60 font-manrope">
                Estimated BMI
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary font-manrope">{bmi}</span>
                {bmiCategory && (
                  <span className={`text-sm font-semibold font-manrope ${bmiCategory.color}`}>
                    {bmiCategory.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
