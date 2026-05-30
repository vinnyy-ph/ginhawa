import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface SymptomsStepProps {
  symptoms: string;
  setSymptoms: (value: string) => void;
  onBack: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  error: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  micError: string | null;
  onMicClick: () => void;
}

export function SymptomsStep({
  symptoms,
  setSymptoms,
  onBack,
  onAnalyze,
  isAnalyzing,
  error,
  isRecording,
  isProcessing,
  isSupported,
  micError,
  onMicClick,
}: SymptomsStepProps) {
  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-text-primary font-serif">What are you looking for?</h2>
          <p className="text-on-surface-variant">
            Describe your symptoms — or the kind of doctor you want (e.g. &quot;dentist in Manila with 5+ years&quot;). Type or use your voice.
          </p>
        </div>

        <Card className="p-8 shadow-lifted border-none rounded-3xl bg-surface-white">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <label htmlFor="symptoms" className="block text-sm font-semibold text-text-primary uppercase tracking-wide">
                Your Symptoms
              </label>
              {isSupported && (
                <button
                  type="button"
                  onClick={onMicClick}
                  disabled={isProcessing}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all ${
                    isRecording
                      ? "bg-error text-white shadow-md animate-pulse"
                      : isProcessing
                      ? "bg-surface-variant text-on-surface-variant opacity-70 cursor-not-allowed"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? (
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h-3v2h8v-2h-3v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
                    </svg>
                  )}
                  {isProcessing ? "Transcribing..." : isRecording ? "Listening..." : "Use Voice"}
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                id="symptoms"
                autoFocus
                className="w-full min-h-[200px] p-5 rounded-2xl border-2 border-outline-variant/40 focus:ring-0 focus:border-primary bg-surface-container-lowest text-on-surface transition-all outline-none text-lg resize-y shadow-inner"
                placeholder="e.g., I've had a headache for 3 days — or: a pediatrician in Cebu with great reviews"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "symptoms-error" : undefined}
              />
            </div>
            {micError && <div className="text-error text-sm mt-2 font-medium" role="alert">{micError}</div>}
            {error && (
              <p id="symptoms-error" className="text-sm text-error font-medium flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {error}
              </p>
            )}
            <div className="flex justify-between items-center text-xs font-medium text-on-surface-variant px-1">
              <span>{symptoms.length < 10 ? "Please enter at least 10 characters" : "Looks detailed enough!"}</span>
              <span>{symptoms.length} characters</span>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Button variant="outline" className="flex-1 py-7 rounded-2xl text-base font-semibold border-outline-variant/60 hover:bg-surface-container-low transition-colors" onClick={onBack}>
              Back
            </Button>
            <Button
              className="flex-[2] py-7 shadow-lifted rounded-2xl text-base font-semibold"
              disabled={symptoms.trim().length < 10 || isAnalyzing}
              onClick={onAnalyze}
            >
              {isAnalyzing ? "Analyzing..." : "Find My Specialist"}
            </Button>
          </div>
        </Card>
      </div>
    </FadeIn>
  );
}
