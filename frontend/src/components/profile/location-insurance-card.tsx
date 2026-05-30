import { FormField } from "@/components/ui/form-field";
import { onboardingInputClass } from "@/components/ui/onboarding-styles";
import { formatPhilHealth, formatHmoCard } from "@/lib/format";
import { InfoRow } from "./profile-fields";
import type { PatientProfileForm, SetProfileField } from "@/hooks/use-patient-profile-form";

interface LocationInsuranceCardProps {
  isEditing: boolean;
  values: PatientProfileForm;
  setField: SetProfileField;
}

export function LocationInsuranceCard({ isEditing, values, setField }: LocationInsuranceCardProps) {
  const { address, city, region, philhealthId, hmoProvider, hmoCardNo } = values;

  return (
    <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6 flex flex-col gap-6">
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-manrope">
        Location &amp; Insurance
      </p>

      {/* Address */}
      <FormField id="p-address" label="Address">
        {isEditing ? (
          <input
            id="p-address"
            className={onboardingInputClass}
            placeholder="123 Rizal St., Barangay Poblacion"
            value={address}
            onChange={(e) => setField("address", e.target.value)}
          />
        ) : (
          <InfoRow label="" value={address} />
        )}
      </FormField>

      {/* City + Region */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="p-city" label="City">
          {isEditing ? (
            <input
              id="p-city"
              className={onboardingInputClass}
              placeholder="Makati"
              value={city}
              onChange={(e) => setField("city", e.target.value)}
            />
          ) : (
            <InfoRow label="" value={city} />
          )}
        </FormField>
        <FormField id="p-region" label="Region">
          {isEditing ? (
            <input
              id="p-region"
              className={onboardingInputClass}
              placeholder="NCR"
              value={region}
              onChange={(e) => setField("region", e.target.value)}
            />
          ) : (
            <InfoRow label="" value={region} />
          )}
        </FormField>
      </div>

      <div className="border-t border-outline-variant/20" />

      {/* PhilHealth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="p-philhealth" label="PhilHealth ID">
          {isEditing ? (
            <input
              id="p-philhealth"
              inputMode="numeric"
              placeholder="12-345678901-2"
              className={onboardingInputClass}
              value={philhealthId}
              onChange={(e) => setField("philhealthId", formatPhilHealth(e.target.value))}
            />
          ) : (
            <InfoRow label="" value={philhealthId} />
          )}
        </FormField>
      </div>

      {/* HMO Provider + Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="p-hmoProvider" label="HMO Provider">
          {isEditing ? (
            <input
              id="p-hmoProvider"
              className={onboardingInputClass}
              placeholder="Maxicare"
              value={hmoProvider}
              onChange={(e) => setField("hmoProvider", e.target.value)}
            />
          ) : (
            <InfoRow label="" value={hmoProvider} />
          )}
        </FormField>
        <FormField id="p-hmoCardNo" label="HMO Card No.">
          {isEditing ? (
            <input
              id="p-hmoCardNo"
              placeholder="XXXX-XXXX-XXXX"
              className={onboardingInputClass}
              value={hmoCardNo}
              onChange={(e) => setField("hmoCardNo", formatHmoCard(e.target.value))}
            />
          ) : (
            <InfoRow label="" value={hmoCardNo} />
          )}
        </FormField>
      </div>
    </div>
  );
}
