'use client'

import {
  DatePicker as AriaDatePicker,
  Group,
  DateInput,
  DateSegment,
  Button,
  Popover,
  Dialog,
} from 'react-aria-components'
import { CalendarIcon } from '@radix-ui/react-icons'
import { parseDate, type CalendarDate } from '@internationalized/date'
import { cn } from '@/lib/utils'
import { PickerCalendar } from '@/components/ui/calendar'

interface DatePickerProps {
  value?: string // "YYYY-MM-DD"
  onChange: (value: string) => void
  minDate?: string // "YYYY-MM-DD"
  maxDate?: string // "YYYY-MM-DD"
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
}

function toCalendarDate(v?: string): CalendarDate | null {
  if (!v) return null
  try {
    return parseDate(v)
  } catch {
    return null
  }
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  id,
  className,
  ...aria
}: DatePickerProps) {
  return (
    <AriaDatePicker
      aria-label={aria['aria-label'] ?? 'Date'}
      value={toCalendarDate(value)}
      onChange={(d) => onChange(d ? d.toString() : '')}
      minValue={toCalendarDate(minDate) ?? undefined}
      maxValue={toCalendarDate(maxDate) ?? undefined}
      isDisabled={disabled}
      shouldForceLeadingZeros
    >
      <Group
        id={id}
        className={cn(
          'flex h-10 w-full items-center rounded-md border border-outline-variant bg-surface px-3 text-sm transition-colors',
          'focus-within:ring-2 focus-within:ring-primary data-[disabled]:opacity-50',
          className,
        )}
      >
        <DateInput className="flex flex-1 items-center">
          {(segment) => (
            <DateSegment
              segment={segment}
              className={cn(
                'rounded px-0.5 tabular-nums outline-none',
                'data-[placeholder]:text-on-surface-variant/50',
                'data-[focused]:bg-primary data-[focused]:text-white',
                'data-[disabled]:text-on-surface-variant/40',
              )}
            />
          )}
        </DateInput>
        <Button className="ml-2 flex items-center text-primary outline-none data-[disabled]:opacity-50">
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </Group>
      <Popover className="rounded-lg border border-outline-variant bg-surface-white p-3 shadow-lifted outline-none">
        <Dialog className="outline-none">
          <PickerCalendar />
        </Dialog>
      </Popover>
    </AriaDatePicker>
  )
}
