/**
 * PublishedRecordView — read-only display of a finalized medical record.
 *
 * Shows consultation notes, prescriptions (via PrescriptionDisplay), patient
 * recommendations, and follow-up advice for a completed appointment. Renders
 * an "Amend record" button that switches the finalize page back to editing
 * mode. Used on /doctor/finalize/[id] when a record already exists.
 */
import { Button } from "@/components/ui/button";
import { ChatBubbleIcon, FileTextIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { PrescriptionDisplay } from "@/components/prescription-display";
import type { MedicalRecord } from "@/types/api";

/**
 * Renders the four sections of a published medical record in read-only format.
 * Sections are conditionally rendered so fields the doctor left blank are omitted.
 */
export function PublishedRecordView({
  record,
  onAmend,
}: {
  record: MedicalRecord;
  onAmend: () => void;
}) {
  return (
    <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
      <div className="bg-gradient-to-r from-brand-light/10 to-brand/10 px-6 py-4 border-b border-outline-variant/30 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-text-primary">Clinical Documentation</h3>
          <p className="text-sm text-on-surface-variant mt-1">This record is published. You can amend it if needed.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onAmend}>Amend record</Button>
      </div>
      <div className="p-6 space-y-8">
        {record.notes && (
          <div>
            <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
              <ChatBubbleIcon className="w-4 h-4 text-primary" /> Consultation Notes
            </h4>
            <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
              {record.notes}
            </div>
          </div>
        )}
        {(record.prescriptions?.length || record.prescription) && (
          <PrescriptionDisplay prescriptions={record.prescriptions} fallbackText={record.prescription} />
        )}
        {record.recommendations && (
          <div>
            <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
              <FileTextIcon className="w-4 h-4 text-info" /> Recommendations
            </h4>
            <div className="bg-surface p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
              {record.recommendations}
            </div>
          </div>
        )}
        {record.followUpAdvice && (
          <div>
            <h4 className="flex items-center gap-2 font-bold font-serif text-text-primary mb-2">
              <CheckCircledIcon className="w-4 h-4 text-primary" /> Follow-up Advice
            </h4>
            <div className="bg-primary/5 p-4 rounded-lg text-sm text-on-surface-variant whitespace-pre-line leading-relaxed border border-primary/10">
              {record.followUpAdvice}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
