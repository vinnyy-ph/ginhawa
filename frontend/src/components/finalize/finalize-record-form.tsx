import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

export interface FinalizeForm {
  doctorSummary: string;
  patientSummary: string;
  prescriptions: string;
  followUp: string;
}

interface FinalizeRecordFormProps {
  values: FinalizeForm;
  setField: (field: keyof FinalizeForm, value: string) => void;
  amending: boolean;
  isPublishing: boolean;
  publishSuccess: boolean;
  summarizeError: string | null;
  onSummarizeRetry: () => void;
  publishError: string | null;
  onPublish: () => void;
}

export function FinalizeRecordForm({
  values,
  setField,
  amending,
  isPublishing,
  publishSuccess,
  summarizeError,
  onSummarizeRetry,
  publishError,
  onPublish,
}: FinalizeRecordFormProps) {
  const [attested, setAttested] = useState(false);
  const [confirmingPublish, setConfirmingPublish] = useState(false);

  return (
    <div className="space-y-6">
      {summarizeError && (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm border border-yellow-200 flex items-center justify-between gap-3">
          <span>{summarizeError}</span>
          <Button onClick={onSummarizeRetry} variant="outline" size="sm">Try Again</Button>
        </div>
      )}

      {publishError && (
        <div className="bg-red-50 text-error p-3 rounded-lg text-sm border border-red-100">
          {publishError}
        </div>
      )}

      {!amending && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            <strong>AI-generated draft.</strong> Review and verify every field — especially the
            prescription — before publishing. Publishing signs this into the patient&apos;s
            permanent medical record.
          </p>
        </div>
      )}

      <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-light/10 to-brand/10 px-6 py-4 border-b border-outline-variant/30">
          <h3 className="font-serif text-lg font-bold text-text-primary">Clinical Documentation</h3>
          <p className="text-xs text-on-surface-variant mt-1">Edit as needed before publishing to the patient record.</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold font-serif text-text-primary mb-2">Consultation Notes</label>
            <textarea
              value={values.doctorSummary}
              onChange={e => setField('doctorSummary', e.target.value)}
              rows={5}
              className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold font-serif text-text-primary mb-2">Recommendations (plain language for the patient)</label>
            <textarea
              value={values.patientSummary}
              onChange={e => setField('patientSummary', e.target.value)}
              rows={4}
              className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold font-serif text-text-primary mb-2">Prescription</label>
            <textarea
              value={values.prescriptions}
              onChange={e => setField('prescriptions', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold font-serif text-text-primary mb-2">Follow-up Advice</label>
            <textarea
              value={values.followUp}
              onChange={e => setField('followUp', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-outline-variant px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface resize-none"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 pb-8">
        <label className="flex items-start gap-3 text-sm text-on-surface cursor-pointer">
          <input
            type="checkbox"
            checked={attested}
            onChange={e => { setAttested(e.target.checked); setConfirmingPublish(false); }}
            className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
          />
          <span>I have reviewed the above and verified its clinical accuracy, including any prescription.</span>
        </label>

        <div className="flex justify-end gap-3 items-center flex-wrap">
          <Button variant="outline" asChild>
            <Link href="/doctor/appointments">Cancel</Link>
          </Button>
          {!confirmingPublish ? (
            <Button
              onClick={() => setConfirmingPublish(true)}
              disabled={!attested || isPublishing || publishSuccess}
              className="min-w-[160px] bg-brand text-white hover:bg-brand-dark"
            >
              {amending ? 'Save amendment' : 'Publish to Patient Record'}
            </Button>
          ) : (
            <>
              <span className="text-sm text-on-surface-variant">{amending ? 'Save changes to this record?' : "Publish to the patient's permanent record?"}</span>
              <Button variant="outline" onClick={() => setConfirmingPublish(false)} disabled={isPublishing}>
                Back
              </Button>
              <Button
                onClick={onPublish}
                disabled={isPublishing || publishSuccess}
                className="bg-brand text-white hover:bg-brand-dark"
              >
                {isPublishing ? (amending ? 'Saving...' : 'Publishing...') : (amending ? 'Confirm amend' : 'Confirm publish')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
