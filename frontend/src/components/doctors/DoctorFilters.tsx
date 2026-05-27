import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Checkbox from "@radix-ui/react-checkbox";
import { Cross2Icon, MixerHorizontalIcon, CheckIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterState {
  specialization: string;
  feeRange: string;
  experience: string;
  languages: string[];
  availability: string;
}

export const defaultFilters: FilterState = {
  specialization: "",
  feeRange: "any",
  experience: "any",
  languages: [],
  availability: "any",
};

interface DoctorFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableSpecializations: string[];
  availableLanguages: string[];
}

export function DoctorFilters({
  filters,
  onFiltersChange,
  availableSpecializations,
  availableLanguages,
}: DoctorFiltersProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sync local state when prop changes from outside (e.g. clear filters)
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const activeCount = Object.keys(filters).reduce((acc, key) => {
    const val = filters[key as keyof FilterState];
    if (Array.isArray(val) && val.length > 0) return acc + 1;
    if (!Array.isArray(val) && val !== "" && val !== "any") return acc + 1;
    return acc;
  }, 0);

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const clearLocalFilters = () => {
    setLocalFilters(defaultFilters);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-lg focus:outline-none focus:ring-2 shadow-sm",
            activeCount > 0
              ? "bg-[#48cab6]/10 border-[#31a795] text-[#006b5e] focus:ring-[#31a795]/40"
              : "bg-surface-white border-outline-variant text-text-primary hover:border-primary/40 focus:ring-primary/40"
          )}
        >
          <MixerHorizontalIcon className="w-4 h-4" />
          Filters {activeCount > 0 && <span className="bg-[#31a795] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ml-1">{activeCount}</span>}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-surface flex flex-col shadow-2xl animate-in slide-in-from-right sm:rounded-l-2xl border-l border-outline-variant/30">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container">
            <Dialog.Title className="text-lg font-bold text-text-primary">Filters</Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="p-2 -mr-2 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="Close filters"
              >
                <Cross2Icon className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {/* Specialization */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-text-primary">Specialization</h4>
              <div className="relative">
                <select
                  value={localFilters.specialization}
                  onChange={(e) => setLocalFilters({ ...localFilters, specialization: e.target.value })}
                  className="w-full px-3 py-2.5 bg-surface-white border border-outline-variant rounded-lg text-sm text-text-primary appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                  aria-label="Filter by specialization"
                >
                  <option value="">All Specializations</option>
                  {availableSpecializations.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <ChevronDownIcon className="w-4 h-4 text-on-surface-variant" />
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-text-primary">Availability</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "any", label: "Any time" },
                  { id: "today", label: "Available Today" },
                  { id: "week", label: "Available this Week" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setLocalFilters({ ...localFilters, availability: opt.id })}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40",
                      localFilters.availability === opt.id
                        ? "bg-[#006b5e] text-white border-[#006b5e] shadow-sm"
                        : "bg-surface-white text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-primary"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fee Range */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-text-primary">Consultation Fee</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "any", label: "Any Price" },
                  { id: "under_1000", label: "Under ₱1,000" },
                  { id: "1000_3000", label: "₱1,000 - ₱3,000" },
                  { id: "above_3000", label: "Above ₱3,000" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setLocalFilters({ ...localFilters, feeRange: opt.id })}
                    className={cn(
                      "px-3 py-2 text-xs font-semibold rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 text-center",
                      localFilters.feeRange === opt.id
                        ? "bg-[#006b5e] text-white border-[#006b5e] shadow-sm"
                        : "bg-surface-white text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-primary"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-text-primary">Years of Experience</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "any", label: "Any" },
                  { id: "5plus", label: "5+ Years" },
                  { id: "10plus", label: "10+ Years" },
                  { id: "15plus", label: "15+ Years" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setLocalFilters({ ...localFilters, experience: opt.id })}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40",
                      localFilters.experience === opt.id
                        ? "bg-[#006b5e] text-white border-[#006b5e] shadow-sm"
                        : "bg-surface-white text-on-surface-variant border-outline-variant hover:border-primary/50 hover:text-primary"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Languages */}
            {availableLanguages.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-text-primary">Languages Spoken</h4>
                <div className="space-y-2">
                  {availableLanguages.map((lang) => (
                    <div key={lang} className="flex items-center">
                      <Checkbox.Root
                        id={`lang-${lang}`}
                        checked={localFilters.languages.includes(lang)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setLocalFilters({
                              ...localFilters,
                              languages: [...localFilters.languages, lang],
                            });
                          } else {
                            setLocalFilters({
                              ...localFilters,
                              languages: localFilters.languages.filter((l) => l !== lang),
                            });
                          }
                        }}
                        className="flex h-5 w-5 appearance-none items-center justify-center rounded-[4px] border border-outline-variant bg-surface-white outline-none focus:ring-2 focus:ring-primary/40 data-[state=checked]:bg-[#006b5e] data-[state=checked]:border-[#006b5e]"
                      >
                        <Checkbox.Indicator className="text-white">
                          <CheckIcon className="w-3.5 h-3.5" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                      <label
                        className="pl-3 text-sm text-text-primary cursor-pointer select-none"
                        htmlFor={`lang-${lang}`}
                      >
                        {lang}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-surface-container bg-surface flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-[#31a795] text-[#006b5e]"
              onClick={clearLocalFilters}
            >
              Clear
            </Button>
            <Button className="flex-1 bg-[#006b5e] hover:bg-[#005248] text-white" onClick={applyFilters}>
              Show Results
            </Button>
          </div>
          <Dialog.Description className="sr-only">Filter doctors by specialty, availability, fee, and more.</Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Inline ChevronDown since it's not imported above to avoid conflict
function ChevronDownIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
    </svg>
  );
}
