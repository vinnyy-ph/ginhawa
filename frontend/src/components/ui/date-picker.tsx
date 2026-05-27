"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  fromDate?: Date
  toDate?: Date
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  className,
  disabled,
  fromDate,
  toDate,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal border-outline-variant bg-surface hover:bg-surface-container transition-colors",
            !date && "text-on-surface-variant",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          autoFocus
          startMonth={fromDate}
          endMonth={toDate}
          disabled={[
            fromDate ? { before: fromDate } : undefined,
            toDate ? { after: toDate } : undefined,
          ].filter((m): m is NonNullable<typeof m> => !!m)}
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
  )
}