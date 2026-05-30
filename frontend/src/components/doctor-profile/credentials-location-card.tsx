import { FormField } from "@/components/ui/form-field";
import { DatePicker } from "@/components/ui/date-picker";
import { onboardingInputClass } from "@/lib/onboarding-styles";
import { formatPrc, formatPtr } from "@/lib/format";
import { InfoRow } from "@/components/profile/profile-fields";

interface CredentialsLocationCardProps {
  isEditing: boolean;
  prcLicenseNo: string;
  setPrcLicenseNo: (v: string) => void;
  prcLicenseExpiry: string;
  setPrcLicenseExpiry: (v: string) => void;
  ptrNo: string;
  setPtrNo: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
}

export function CredentialsLocationCard({
  isEditing,
  prcLicenseNo,
  setPrcLicenseNo,
  prcLicenseExpiry,
  setPrcLicenseExpiry,
  ptrNo,
  setPtrNo,
  region,
  setRegion,
  city,
  setCity,
}: CredentialsLocationCardProps) {
  return (
    <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 p-6 flex flex-col gap-6">
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-manrope">
        Credentials &amp; Location
      </p>

      {/* PRC License No + Expiry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="d-prc" label="PRC license number">
          {isEditing ? (
            <input
              id="d-prc"
              inputMode="numeric"
              placeholder="0123456"
              className={onboardingInputClass}
              value={prcLicenseNo}
              onChange={(e) => setPrcLicenseNo(formatPrc(e.target.value))}
            />
          ) : (
            <InfoRow label="" value={prcLicenseNo} />
          )}
        </FormField>
        <FormField id="d-prcExpiry" label="PRC license expiry">
          {isEditing ? (
            <DatePicker
              id="d-prcExpiry"
              value={prcLicenseExpiry}
              onChange={setPrcLicenseExpiry}
            />
          ) : (
            <InfoRow label="" value={prcLicenseExpiry} />
          )}
        </FormField>
      </div>

      {/* PTR Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="d-ptr" label="PTR number">
          {isEditing ? (
            <input
              id="d-ptr"
              inputMode="numeric"
              placeholder="12345678"
              className={onboardingInputClass}
              value={ptrNo}
              onChange={(e) => setPtrNo(formatPtr(e.target.value))}
            />
          ) : (
            <InfoRow label="" value={ptrNo} />
          )}
        </FormField>
      </div>

      {/* Divider */}
      <div className="border-t border-outline-variant/20" />

      {/* Region + City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="d-region" label="Region">
          {isEditing ? (
            <input
              id="d-region"
              className={onboardingInputClass}
              placeholder="NCR"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          ) : (
            <InfoRow label="" value={region} />
          )}
        </FormField>
        <FormField id="d-city" label="City">
          {isEditing ? (
            <input
              id="d-city"
              className={onboardingInputClass}
              placeholder="Makati"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          ) : (
            <InfoRow label="" value={city} />
          )}
        </FormField>
      </div>
    </div>
  );
}
