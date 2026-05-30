'use client'

/**
 * TimeField — accessible time input built on React Aria Components.
 * Accepts and emits 24-hour "HH:mm" strings; renders in 12-hour (AM/PM)
 * display format. Internally converts to/from @internationalized/date Time.
 */
import { TimeField as AriaTimeField, DateInput, DateSegment } from 'react-aria-components'
import { parseTime, type Time } from '@internationalized/date'
import { cn } from '@/lib/utils'

interface TimeFieldProps {
  value?: string // "HH:mm" (24h)
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
}

function toTime(v?: string): Time | null {
  if (!v) return null
  try {
    return parseTime(v)
  } catch {
    return null
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function TimeField({ value, onChange, disabled, id, className, ...aria }: TimeFieldProps) {
  return (
    <AriaTimeField
      id={id}
      aria-label={aria['aria-label'] ?? 'Time'}
      value={toTime(value)}
      onChange={(t) => onChange(t ? `${pad(t.hour)}:${pad(t.minute)}` : '')}
      hourCycle={12}
      isDisabled={disabled}
      shouldForceLeadingZeros
    >
      <DateInput
        className={cn(
          'flex h-10 w-full items-center rounded-md border border-outline-variant bg-surface px-3 text-sm',
          'focus-within:ring-2 focus-within:ring-primary data-[disabled]:opacity-50',
          className,
        )}
      >
        {(segment) => (
          <DateSegment
            segment={segment}
            className={cn(
              'rounded px-0.5 tabular-nums outline-none',
              'data-[placeholder]:text-on-surface-variant/50',
              'data-[focused]:bg-primary data-[focused]:text-white',
            )}
          />
        )}
      </DateInput>
    </AriaTimeField>
  )
}
