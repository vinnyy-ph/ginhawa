'use client'

import { useState, useMemo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { cn } from '@/lib/utils'

interface MultiDateCalendarProps {
  selectedDates: string[]
  onChange: (dates: string[]) => void
  minDate?: string // YYYY-MM-DD
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function MultiDateCalendar({ selectedDates, onChange, minDate }: MultiDateCalendarProps) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const minISO = minDate ?? toISO(now.getFullYear(), now.getMonth(), now.getDate())

  function isDisabled(iso: string) {
    return iso < minISO
  }

  function toggle(iso: string) {
    if (isDisabled(iso)) return
    onChange(
      selectedDates.includes(iso)
        ? selectedDates.filter((d) => d !== iso)
        : [...selectedDates, iso].sort(),
    )
  }

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const result: (string | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) result.push(toISO(viewYear, viewMonth, d))
    return result
  }, [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-text-primary">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant transition-colors"
          aria-label="Next month"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-on-surface-variant py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((iso, idx) => {
          if (!iso) return <div key={`e-${idx}`} />
          const disabled = isDisabled(iso)
          const selected = selectedDates.includes(iso)
          return (
            <button
              key={iso}
              type="button"
              onClick={() => toggle(iso)}
              disabled={disabled}
              aria-label={iso}
              aria-pressed={selected}
              className={cn(
                'h-9 w-full rounded-md text-sm font-medium transition-colors',
                disabled && 'text-on-surface-variant/30 cursor-default',
                !disabled && !selected && 'hover:bg-primary/10 hover:text-primary text-text-primary cursor-pointer',
                selected && 'bg-primary text-white hover:bg-primary/90',
              )}
            >
              {parseInt(iso.slice(8))}
            </button>
          )
        })}
      </div>

      {/* Selection summary */}
      {selectedDates.length > 0 && (
        <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
          <span className="text-on-surface-variant">
            <span className="font-bold text-primary">{selectedDates.length}</span>{' '}
            date{selectedDates.length !== 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-on-surface-variant hover:text-error font-semibold transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
