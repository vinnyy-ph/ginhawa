import { PatientContextPanel, type PatientContext } from "./patient-context-panel";

interface DoctorSidebarProps {
  activeTab: 'notes' | 'patient';
  onTabChange: (tab: 'notes' | 'patient') => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  isSaving: boolean;
  patientContext: PatientContext | null;
  onEndAndFinalize: () => void;
}

export function ConsultationDoctorSidebar({
  activeTab,
  onTabChange,
  notes,
  onNotesChange,
  isSaving,
  patientContext,
  onEndAndFinalize,
}: DoctorSidebarProps) {
  return (
    <div className="w-80 bg-surface-white flex flex-col border-l border-outline-variant/30">
      {/* Tab headers */}
      <div className="flex border-b border-outline-variant/30">
        <button
          onClick={() => onTabChange('notes')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'notes' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Live Notes
          {isSaving && <span className="ml-1 text-xs text-on-surface-variant">(saving...)</span>}
        </button>
        <button
          onClick={() => onTabChange('patient')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'patient' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Patient
        </button>
      </div>

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Document findings, symptoms, observations..."
          className="flex-1 resize-none p-4 text-sm text-on-surface bg-surface-white focus:outline-none"
        />
      )}

      {/* Patient context tab */}
      {activeTab === 'patient' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          <PatientContextPanel patientContext={patientContext} />
        </div>
      )}

      <div className="p-4 border-t border-outline-variant/30 space-y-3">
        <p className="text-xs text-on-surface-variant">
          Notes auto-save every 1.5s. They will be used for AI summarization after the call.
        </p>
        <button
          onClick={onEndAndFinalize}
          className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-md transition-colors"
        >
          End &amp; Finalize →
        </button>
      </div>
    </div>
  );
}
