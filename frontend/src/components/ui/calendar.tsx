'use client'

/**
 * PickerCalendar — React Aria Components calendar for use inside DatePicker.
 * Value, min, and max are supplied via RAC context; the focused month/year is
 * managed locally so year-jump buttons can skip forward/backward without
 * affecting the controlled date value.
 */
import { useState } from 'react'
import {
  Calendar,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarCell,
  CalendarHeading,
  Button,
} from 'react-aria-components'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons'
import { today, getLocalTimeZone, type DateValue } from '@internationalized/date'
import { cn } from '@/lib/utils'

// Presentational calendar for use inside <DatePicker>. Value/min/max come from RAC context;
// focus (which month/year is shown) is controlled here so we can offer year jumps.
export function PickerCalendar() {
  const [focused, setFocused] = useState<DateValue>(today(getLocalTimeZone()))
  return (
    <Calendar className="w-fit" focusedValue={focused} onFocusChange={setFocused}>
      <header className="flex items-center justify-between gap-1 px-1 pb-3">
        <button
          type="button"
          aria-label="Previous year"
          onClick={() => setFocused((f) => f.subtract({ years: 1 }))}
          className="flex h-9 w-9 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary"
        >
          <DoubleArrowLeftIcon className="h-4 w-4" />
        </button>
        <Button
          slot="previous"
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container data-[disabled]:opacity-30"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <CalendarHeading className="flex-1 text-center text-sm font-semibold text-text-primary" />
        <Button
          slot="next"
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container data-[disabled]:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <button
          type="button"
          aria-label="Next year"
          onClick={() => setFocused((f) => f.add({ years: 1 }))}
          className="flex h-9 w-9 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary"
        >
          <DoubleArrowRightIcon className="h-4 w-4" />
        </button>
      </header>
      <CalendarGrid className="border-collapse">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="w-11 pb-1 text-[0.7rem] font-normal text-on-surface-variant">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={cn(
                'flex h-11 w-11 cursor-pointer items-center justify-center rounded-md text-sm outline-none transition-colors',
                'data-[hovered]:bg-primary/10 data-[hovered]:text-primary',
                'data-[selected]:bg-primary data-[selected]:text-white data-[selected]:hover:bg-primary',
                'data-[focus-visible]:ring-2 data-[focus-visible]:ring-primary',
                'data-[disabled]:cursor-default data-[disabled]:text-on-surface-variant/30 data-[disabled]:hover:bg-transparent',
                'data-[unavailable]:cursor-default data-[unavailable]:text-on-surface-variant/30',
                'data-[outside-month]:text-on-surface-variant/30',
              )}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </Calendar>
  )
}
