"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface BirthdateInputProps {
  value?: string // YYYY-MM-DD
  onChange: (value: string) => void
  disabled?: boolean
}

export function BirthdateInput({ value, onChange, disabled }: BirthdateInputProps) {
  const [month, setMonth] = React.useState("")
  const [day, setDay] = React.useState("")
  const [year, setYear] = React.useState("")
  const [calendarOpen, setCalendarOpen] = React.useState(false)

  const monthRef = React.useRef<HTMLInputElement>(null)
  const dayRef = React.useRef<HTMLInputElement>(null)
  const yearRef = React.useRef<HTMLInputElement>(null)

  // Initialize/Sync from value during render to avoid cascading renders in useEffect
  const [prevValue, setPrevValue] = React.useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (value && value.length === 10) {
      const [y, m, d] = value.split("-")
      setMonth(m || "")
      setDay(d || "")
      setYear(y || "")
    } else if (!value || value.length === 0) {
      setMonth("")
      setDay("")
      setYear("")
    }
  }

  const updateValue = (m: string, d: string, y: string) => {
    if (m.length === 2 && d.length === 2 && y.length === 4) {
      const dateStr = `${y}-${m}-${d}`
      const date = parse(dateStr, "yyyy-MM-dd", new Date())
      if (isValid(date)) {
        onChange(dateStr)
        return
      }
    }
    // If not complete or not valid, sync with empty string
    onChange("")
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2)
    setMonth(val)
    if (val.length === 2) dayRef.current?.focus()
    updateValue(val, day, year)
  }

  const handleMonthBlur = () => {
    if (month.length === 1) {
      const padded = `0${month}`
      setMonth(padded)
      updateValue(padded, day, year)
    }
  }

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2)
    setDay(val)
    if (val.length === 2) yearRef.current?.focus()
    updateValue(month, val, year)
  }

  const handleDayBlur = () => {
    if (day.length === 1) {
      const padded = `0${day}`
      setDay(padded)
      updateValue(month, padded, year)
    }
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4)
    setYear(val)
    updateValue(month, day, val)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, prevRef: React.RefObject<HTMLInputElement | null>, currentVal: string) => {
    if (e.key === "Backspace" && currentVal === "") {
      prevRef.current?.focus()
    }
  }

  const handleCalendarSelect = (date?: Date) => {
    if (date) {
      const m = format(date, "MM")
      const d = format(date, "dd")
      const y = format(date, "yyyy")
      setMonth(m)
      setDay(d)
      setYear(y)
      onChange(format(date, "yyyy-MM-dd"))
      setCalendarOpen(false)
    } else {
      setMonth("")
      setDay("")
      setYear("")
      onChange("")
    }
  }

  const inputClasses = "w-full bg-transparent border-none p-0 text-center focus:ring-0 text-sm font-manrope placeholder:text-on-surface-variant/30"

  const parsedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
  const validParsedDate = parsedDate && isValid(parsedDate) ? parsedDate : undefined

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex items-center gap-1 px-3 py-2 rounded-md border border-outline-variant bg-surface focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all flex-1 max-w-[240px]",
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        <div className="flex-1 flex flex-col items-center">
          <label className="sr-only">Month</label>
          <input
            ref={monthRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="MM"
            value={month}
            onChange={handleMonthChange}
            onBlur={handleMonthBlur}
            disabled={disabled}
            className={inputClasses}
            aria-label="Birth month (MM)"
          />
        </div>
        <span className="text-outline-variant">/</span>
        <div className="flex-1 flex flex-col items-center">
          <label className="sr-only">Day</label>
          <input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="DD"
            value={day}
            onChange={handleDayChange}
            onBlur={handleDayBlur}
            onKeyDown={(e) => handleKeyDown(e, monthRef, day)}
            disabled={disabled}
            className={inputClasses}
            aria-label="Birth day (DD)"
          />
        </div>
        <span className="text-outline-variant">/</span>
        <div className="flex-1 flex flex-col items-center min-w-[60px]">
          <label className="sr-only">Year</label>
          <input
            ref={yearRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="YYYY"
            value={year}
            onChange={handleYearChange}
            onKeyDown={(e) => handleKeyDown(e, dayRef, year)}
            disabled={disabled}
            className={inputClasses}
            aria-label="Birth year (YYYY)"
          />
        </div>
      </div>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 border-outline-variant bg-surface" disabled={disabled} type="button">
            <CalendarIcon className="h-4 w-4 text-on-surface-variant" />
            <span className="sr-only">Open calendar</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={validParsedDate}
            onSelect={handleCalendarSelect}
            defaultMonth={validParsedDate}
            endMonth={new Date()}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
