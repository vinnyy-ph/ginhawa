"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface BirthdateInputProps {
  value?: string // YYYY-MM-DD
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

export function BirthdateInput({ value, onChange, disabled, className }: BirthdateInputProps) {
  const [month, setMonth] = React.useState("")
  const [day, setDay] = React.useState("")
  const [year, setYear] = React.useState("")
  const [calendarOpen, setCalendarOpen] = React.useState(false)

  const monthRef = React.useRef<HTMLInputElement>(null)
  const dayRef = React.useRef<HTMLInputElement>(null)
  const yearRef = React.useRef<HTMLInputElement>(null)

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
    const mm = m.padStart(2, '0')
    const dd = d.padStart(2, '0')
    if (mm.length === 2 && dd.length === 2 && y.length === 4) {
      const dateStr = `${y}-${mm}-${dd}`
      const date = parse(dateStr, "yyyy-MM-dd", new Date())
      if (isValid(date)) {
        onChange(dateStr)
        return
      }
    }
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
    updateValue(month, day, year)
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

  const parsedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
  const validParsedDate = parsedDate && isValid(parsedDate) ? parsedDate : undefined

  const inputClasses = "bg-transparent border-none p-0 text-center outline-none focus:ring-0 text-sm placeholder:text-on-surface-variant/50"

  return (
    <div
      className={cn(
        "flex h-10 w-full items-center justify-start rounded-md border border-outline-variant bg-surface px-4 py-2 text-left text-sm font-normal transition-colors hover:bg-surface-container focus-within:bg-surface-container focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-0",
        !value && "text-on-surface-variant",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button 
            type="button" 
            disabled={disabled} 
            className="mr-2 flex h-full items-center outline-none shrink-0"
          >
            <CalendarIcon className="h-4 w-4 text-primary" />
            <span className="sr-only">Open calendar</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <Calendar
            mode="single"
            selected={validParsedDate}
            onSelect={handleCalendarSelect}
            defaultMonth={validParsedDate}
            endMonth={new Date()}
            disabled={{ after: new Date() }}
            captionLayout="dropdown"
            fromYear={1900}
            toYear={new Date().getFullYear()}
            classNames={{
              months: "relative",
              month_caption: "flex justify-center h-7 pt-1 items-center",
              caption_label: "text-sm font-medium",
              nav: "absolute top-0 left-0 right-0 flex justify-between items-center z-10",
              button_previous: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              button_next: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            }}
          />
        </PopoverContent>
      </Popover>

      <div className="flex flex-1 items-center">
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
          className={cn(inputClasses, "w-6")}
          aria-label="Birth month (MM)"
        />
        <span className="px-1 text-on-surface-variant/50">/</span>
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
          className={cn(inputClasses, "w-6")}
          aria-label="Birth day (DD)"
        />
        <span className="px-1 text-on-surface-variant/50">/</span>
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
          className={cn(inputClasses, "w-10")}
          aria-label="Birth year (YYYY)"
        />
      </div>
    </div>
  )
}