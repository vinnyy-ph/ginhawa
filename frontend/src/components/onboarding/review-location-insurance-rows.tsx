import type { OnboardingData } from "@/types/patient";
import { EditableRow, editInputClass } from "@/components/ui/editable-row";
import { formatPhilHealth, formatHmoCard, isValidPhilHealth, isValidHmoCard } from "@/lib/format";

interface Props {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
}

export function ReviewLocationInsuranceRows({ data, update }: Props) {
  const hasLocationInsurance =
    !!(data.address || data.city || data.region || data.philhealthId || data.hmoProvider || data.hmoCardNo);
  if (!hasLocationInsurance) return null;

  return (
    <>
      <div className="col-span-full h-px bg-outline-variant/30" />
      <EditableRow
        fullWidth
        label="Location"
        display={[data.address, data.city, data.region].filter(Boolean).join(', ')}
        initial={{ address: data.address, city: data.city, region: data.region }}
        onSave={update}
        render={(d, set) => (
          <div className="flex flex-col gap-2">
            <input className={editInputClass} placeholder="Address" value={d.address} onChange={(e) => set('address', e.target.value)} />
            <div className="flex gap-2">
              <input className={editInputClass} placeholder="City" value={d.city} onChange={(e) => set('city', e.target.value)} />
              <input className={editInputClass} placeholder="Region" value={d.region} onChange={(e) => set('region', e.target.value)} />
            </div>
          </div>
        )}
      />
      <EditableRow
        label="PhilHealth ID"
        display={data.philhealthId}
        initial={{ philhealthId: data.philhealthId }}
        onSave={update}
        validate={(d) => (isValidPhilHealth(d.philhealthId ?? '') ? null : "Can't save — enter the full 12-digit PhilHealth ID")}
        render={(d, set) => (
          <input className={editInputClass} inputMode="numeric" value={d.philhealthId}
            onChange={(e) => set('philhealthId', formatPhilHealth(e.target.value))} />
        )}
      />
      <EditableRow
        label="HMO"
        display={[data.hmoProvider, data.hmoCardNo].filter(Boolean).join(' · ')}
        initial={{ hmoProvider: data.hmoProvider, hmoCardNo: data.hmoCardNo }}
        onSave={update}
        validate={(d) => (isValidHmoCard(d.hmoCardNo ?? '') ? null : "Can't save — enter the full 12-character HMO card number")}
        render={(d, set) => (
          <div className="flex gap-2">
            <input className={editInputClass} placeholder="Provider" value={d.hmoProvider} onChange={(e) => set('hmoProvider', e.target.value)} />
            <input className={editInputClass} placeholder="Card no." value={d.hmoCardNo} onChange={(e) => set('hmoCardNo', formatHmoCard(e.target.value))} />
          </div>
        )}
      />
    </>
  );
}
