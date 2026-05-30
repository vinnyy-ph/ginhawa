"use client";

/**
 * WeeklyTemplateForm — bulk slot generator for the doctor schedule page.
 *
 * Allows a doctor to define a repeating weekly availability template and generate
 * many slots at once rather than adding them one by one. Configuration covers:
 * which days of the week, a start date, number of weeks to repeat, daily work
 * window (start/end), slot length (30 or 60 min), and an optional daily break
 * window that is excluded from slot generation.
 *
 * Slot count is previewed live via `generateSlots` (from lib/generate-slots) and
 * capped at MAX_BULK_SLOTS (1000) to prevent accidental mass creation. The actual
 * API call is delegated to `onGenerate` so the page holds the session token.
 *
 * Embedded inside ScheduleCalendar's collapsible recurring panel.
 */

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { TimeField } from "@/components/ui/time-field";
import { Chip } from "@/components/ui/chip";
import { localTodayISO } from "@/lib/schemas/onboarding.schemas";
import { generateSlots, type WeeklyTemplate, type GeneratedSlot } from "@/lib/generate-slots";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_BULK_SLOTS = 1000;

/**
 * Self-contained weekly availability template builder. Owns all template form
 * state and slot preview; delegates only the bulk-create API call to the page
 * via onGenerate, which should throw on failure so this form can surface it.
 */
export function WeeklyTemplateForm({
  onGenerate,
}: {
  onGenerate: (slots: GeneratedSlot[]) => Promise<void>;
}) {
  const [tplWeekdays, setTplWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [tplStartDate, setTplStartDate] = useState("");
  const [tplWeeks, setTplWeeks] = useState(4);
  const [tplDayStart, setTplDayStart] = useState("09:00");
  const [tplDayEnd, setTplDayEnd] = useState("17:00");
  const [tplSlotMinutes, setTplSlotMinutes] = useState(60);
  const [tplBreakOn, setTplBreakOn] = useState(false);
  const [tplBreakStart, setTplBreakStart] = useState("12:00");
  const [tplBreakEnd, setTplBreakEnd] = useState("13:00");
  const [tplSubmitting, setTplSubmitting] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);

  const template: WeeklyTemplate = useMemo(
    () => ({
      weekdays: tplWeekdays,
      startDate: tplStartDate,
      weeks: tplWeeks,
      dayStart: tplDayStart,
      dayEnd: tplDayEnd,
      slotMinutes: tplSlotMinutes,
      breakWindow: tplBreakOn ? { start: tplBreakStart, end: tplBreakEnd } : null,
    }),
    [tplWeekdays, tplStartDate, tplWeeks, tplDayStart, tplDayEnd, tplSlotMinutes, tplBreakOn, tplBreakStart, tplBreakEnd],
  );

  const previewSlots = useMemo(
    () => (tplStartDate ? generateSlots(template) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template],
  );

  function toggleWeekday(d: number) {
    setTplWeekdays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setTplError(null);
    if (tplDayEnd <= tplDayStart) { setTplError("Day end time must be after start time"); return; }
    if (tplBreakOn && tplBreakEnd <= tplBreakStart) { setTplError("Break end time must be after break start time"); return; }
    if (previewSlots.length === 0) { setTplError("This template generates no slots. Check your inputs."); return; }
    if (previewSlots.length > MAX_BULK_SLOTS) { setTplError(`Too many slots (${previewSlots.length}). Max ${MAX_BULK_SLOTS}.`); return; }
    try {
      setTplSubmitting(true);
      await onGenerate(previewSlots);
    } catch (err) {
      setTplError(err instanceof Error ? err.message : "Failed to generate slots");
    } finally {
      setTplSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleGenerate} className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-2">Days of week</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, d) => (
            <Chip key={d} selected={tplWeekdays.includes(d)} onClick={() => toggleWeekday(d)}>
              {label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Day start</label>
          <TimeField value={tplDayStart} onChange={setTplDayStart} aria-label="Day start time" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Day end</label>
          <TimeField value={tplDayEnd} onChange={setTplDayEnd} aria-label="Day end time" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Slot length</label>
          <select
            value={tplSlotMinutes}
            onChange={(e) => setTplSlotMinutes(Number(e.target.value))}
            className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-white text-text-primary"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1">Repeat for (weeks)</label>
          <input
            type="number"
            min={1}
            max={12}
            value={tplWeeks}
            onChange={(e) => setTplWeeks(Math.min(12, Math.max(1, Number(e.target.value))))}
            className="w-full h-11 px-3 rounded-lg border border-outline-variant bg-surface-white text-text-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1">Start date</label>
        <DatePicker value={tplStartDate} onChange={setTplStartDate} minDate={localTodayISO()} />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2">
          <input type="checkbox" checked={tplBreakOn} onChange={(e) => setTplBreakOn(e.target.checked)} />
          Add a daily break (skipped)
        </label>
        {tplBreakOn && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Break start</label>
              <TimeField value={tplBreakStart} onChange={setTplBreakStart} aria-label="Break start time" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Break end</label>
              <TimeField value={tplBreakEnd} onChange={setTplBreakEnd} aria-label="Break end time" />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-outline-variant/30">
        <p className="text-sm text-on-surface-variant">
          {tplStartDate
            ? <><span className="font-semibold text-text-primary">{previewSlots.length}</span> slots will be created.</>
            : "Pick a start date to preview."}
        </p>
        <Button
          type="submit"
          disabled={tplSubmitting || previewSlots.length === 0 || previewSlots.length > MAX_BULK_SLOTS}
          className="min-w-[140px]"
        >
          {tplSubmitting ? "Generating..." : "Generate slots"}
        </Button>
      </div>
      {tplError && <p className="text-error text-sm">{tplError}</p>}
    </form>
  );
}
