'use client'

import {
  Calendar,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarCell,
  Heading,
  Button,
} from 'react-aria-components'
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { cn } from '@/lib/utils'

// Presentational calendar for use inside <DatePicker>. Reads value/min/max from RAC context.
export function PickerCalendar() {
  return (
    <Calendar className="w-fit">
      <header className="flex items-center justify-between px-1 pb-3">
        <Button
          slot="previous"
          className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container data-[disabled]:opacity-30"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Heading className="text-sm font-semibold text-text-primary" />
        <Button
          slot="next"
          className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant outline-none hover:bg-surface-container data-[disabled]:opacity-30"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </header>
      <CalendarGrid className="border-collapse">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="w-9 pb-1 text-[0.7rem] font-normal text-on-surface-variant">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={cn(
                'flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-sm outline-none transition-colors',
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
