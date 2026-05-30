"use client";

import React, { useMemo } from "react";
import {
  Calendar,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarCell,
  CalendarHeading,
  Button,
} from "react-aria-components";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { today, parseDate, type DateValue } from "@internationalized/date";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot } from "@/types/api";

const PH_TZ = "Asia/Manila";
// en-CA yields YYYY-MM-DD, matching CalendarDate.toString().
const keyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: PH_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** PH-local date key (YYYY-MM-DD) for an ISO timestamp. */
export function phDateKey(iso: string): string {
  return keyFmt.format(new Date(iso));
}

interface BookingCalendarProps {
  slots: AvailabilitySlot[];
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string) => void;
}

export function BookingCalendar({
  slots,
  selectedDateKey,
  onSelectDate,
}: BookingCalendarProps) {
  const availableKeys = useMemo(
    () => new Set(slots.map((s) => phDateKey(s.startTime))),
    [slots]
  );

  const value = selectedDateKey ? parseDate(selectedDateKey) : null;

  return (
    <Calendar
      aria-label="Choose appointment date"
      className="w-fit mx-auto"
      minValue={today(PH_TZ)}
      value={value}
      onChange={(d: DateValue) => onSelectDate(d.toString())}
      isDateUnavailable={(d) => !availableKeys.has(d.toString())}
    >
      <header className="flex items-center justify-between gap-1 px-1 pb-3">
        <Button
          slot="previous"
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container data-[disabled]:opacity-30"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <CalendarHeading className="flex-1 text-center text-sm font-semibold text-text-primary" />
        <Button
          slot="next"
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container data-[disabled]:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </header>
      <CalendarGrid className="border-collapse">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="w-10 pb-1 text-[0.7rem] font-normal text-on-surface-variant">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={cn(
                "flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-sm outline-none transition-colors",
                "data-[hovered]:bg-primary/10 data-[hovered]:text-primary",
                "data-[selected]:bg-primary data-[selected]:text-white data-[selected]:hover:bg-primary",
                "data-[focus-visible]:ring-2 data-[focus-visible]:ring-primary",
                "data-[disabled]:cursor-default data-[disabled]:text-on-surface-variant/30 data-[disabled]:hover:bg-transparent",
                "data-[unavailable]:cursor-default data-[unavailable]:text-on-surface-variant/20 data-[unavailable]:line-through data-[unavailable]:hover:bg-transparent",
                "data-[outside-month]:text-on-surface-variant/30"
              )}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </Calendar>
  );
}
