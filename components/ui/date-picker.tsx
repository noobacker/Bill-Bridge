"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { type DateRange } from "react-day-picker"

export interface DatePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({ 
  date, 
  setDate, 
  placeholder = "Select date", 
  className,
  disabled = false
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal min-w-[140px]",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 dark:bg-zinc-900 border dark:border-zinc-800" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          defaultMonth={date || new Date()}
          classNames={{
            day_selected: "bg-blue-600 text-white hover:bg-blue-700",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export interface DateRangePickerProps {
  dateRange: DateRange | undefined
  setDateRange: (dateRange: DateRange | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  align?: "center" | "start" | "end"
  numberOfMonths?: number
}

export function DateRangePicker({
  dateRange,
  setDateRange,
  placeholder = "Select date range",
  className,
  disabled = false,
  align = "start",
  numberOfMonths = 2
}: DateRangePickerProps) {
  // Format date for display with shorter month names to save space
  const formatDateDisplay = (date: Date) => {
    return format(date, "dd MMM yy")
  }
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal truncate",
            !dateRange?.from && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {formatDateDisplay(dateRange.from)} - {formatDateDisplay(dateRange.to)}
                </>
              ) : (
                formatDateDisplay(dateRange.from)
              )
            ) : (
              placeholder
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 dark:bg-zinc-900 border dark:border-zinc-800" 
        align={align}
      >
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={setDateRange}
          numberOfMonths={numberOfMonths}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export interface MonthPickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MonthPicker({
  date,
  setDate,
  placeholder = "Select month",
  className,
  disabled = false
}: MonthPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "MMMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 dark:bg-zinc-900 border dark:border-zinc-800" 
        align="start"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          captionLayout="dropdown-buttons"
          fromYear={2020}
          toYear={2030}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  )
} 