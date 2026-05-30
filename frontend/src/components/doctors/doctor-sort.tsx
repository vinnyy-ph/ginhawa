import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDownIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

export type SortOption = 
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "exp_desc"
  | "exp_asc"
  | "availability";

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Relevance",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  exp_desc: "Most Experienced",
  exp_asc: "Least Experienced",
  availability: "Earliest Availability",
};

interface DoctorSortProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function DoctorSort({ value, onChange }: DoctorSortProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex items-center justify-between min-w-[180px] px-4 py-2 text-sm font-medium transition-colors bg-surface-white border border-outline-variant rounded-lg hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
          aria-label="Sort options"
        >
          <span className="text-on-surface-variant flex items-center gap-2">
            Sort by: <span className="text-text-primary font-semibold">{SORT_LABELS[value]}</span>
          </span>
          <ChevronDownIcon className="w-4 h-4 text-on-surface-variant ml-2" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 p-1 bg-surface-white rounded-xl shadow-elevated border border-outline-variant animate-in fade-in-80 zoom-in-95"
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={(val) => onChange(val as SortOption)}>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <DropdownMenu.RadioItem
                key={option}
                value={option}
                className={cn(
                  "relative flex items-center px-8 py-2.5 text-sm font-medium rounded-lg outline-none cursor-pointer transition-colors",
                  "focus:bg-primary/5 focus:text-primary data-[state=checked]:text-primary data-[state=checked]:bg-primary/10"
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <DropdownMenu.ItemIndicator>
                    <CheckIcon className="w-4 h-4 text-primary" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {SORT_LABELS[option]}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
