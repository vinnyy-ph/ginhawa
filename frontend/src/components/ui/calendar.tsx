"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold font-plus-jakarta text-text-primary",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 z-10"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 z-10"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-on-surface-variant rounded-md w-8 font-normal text-[0.8rem] font-manrope",
        week: "flex w-full mt-2",
        day: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-surface-container/50 [&:has([aria-selected])]:bg-surface-container first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 hover:text-primary aria-selected:hover:bg-primary aria-selected:hover:text-white transition-colors"
        ),
        selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white rounded-md",
        today: "bg-surface-container text-primary font-bold rounded-md",
        outside: "day-outside text-on-surface-variant/30 opacity-50 aria-selected:bg-surface-container/50 aria-selected:text-on-surface-variant/30 aria-selected:opacity-30",
        disabled: "text-on-surface-variant/30 opacity-50",
        range_middle: "aria-selected:bg-surface-container aria-selected:text-on-surface",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => {
          if (props.orientation === "left") return <ChevronLeftIcon className="h-4 w-4" />
          return <ChevronRightIcon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
