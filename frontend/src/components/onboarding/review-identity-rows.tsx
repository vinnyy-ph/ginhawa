import type { OnboardingData } from "@/types/patient-profile";
import { EditableRow, editInputClass } from "@/components/ui/editable-row";
import { PhoneInput } from "@/components/ui/phone-input";
import { DatePicker } from "@/components/ui/date-picker";
import { formatPhone } from "@/lib/format";
import { localTodayISO } from "@/lib/schemas/onboarding.schemas";

interface Props {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
}

export function ReviewIdentityRows({ data, update }: Props) {
  return (
    <>
      <EditableRow
        label="Full Name"
        display={data.fullName}
        initial={{ fullName: data.fullName }}
        onSave={update}
        render={(d, set) => (
          <input className={editInputClass} value={d.fullName} onChange={(e) => set('fullName', e.target.value)} />
        )}
      />
      <EditableRow
        label="Date of Birth"
        display={data.birthdate}
        initial={{ birthdate: data.birthdate }}
        onSave={update}
        render={(d, set) => (
          <DatePicker value={d.birthdate} onChange={(v) => set('birthdate', v)} maxDate={localTodayISO()} />
        )}
      />
      <EditableRow
        label="Contact Info"
        display={formatPhone(data.contactDetails)}
        initial={{ contactDetails: data.contactDetails }}
        onSave={update}
        render={(d, set) => (
          <PhoneInput
            value={formatPhone(d.contactDetails)}
            onChange={(e) => set('contactDetails', e.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 10))}
          />
        )}
      />
      <EditableRow
        label="Metrics"
        display={`${data.weightKg ? data.weightKg + 'kg' : '—'} / ${data.heightCm ? data.heightCm + 'cm' : '—'}`}
        initial={{ weightKg: data.weightKg, heightCm: data.heightCm }}
        onSave={update}
        render={(d, set) => (
          <div className="flex gap-2">
            <input type="number" min="0" step="0.1" placeholder="kg" className={editInputClass}
              value={d.weightKg ?? ''} onChange={(e) => set('weightKg', e.target.value === '' ? null : parseFloat(e.target.value))} />
            <input type="number" min="0" step="0.1" placeholder="cm" className={editInputClass}
              value={d.heightCm ?? ''} onChange={(e) => set('heightCm', e.target.value === '' ? null : parseFloat(e.target.value))} />
          </div>
        )}
      />
    </>
  );
}
