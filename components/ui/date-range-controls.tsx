"use client";
import { DatePicker } from "@/components/ui/date-picker";
import { useState, useEffect } from "react";
import { addDays } from "date-fns";

export default function DateRangeControls({
  from,
  to,
  onChange,
  className = "",
  startPlaceholder = "Start date",
  endPlaceholder = "End date",
}: {
  from?: string;
  to?: string;
  onChange: (from?: Date, to?: Date) => void;
  className?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
}) {
  const [startDate, setStartDate] = useState<Date | undefined>(from ? new Date(from) : addDays(new Date(), -30));
  const [endDate, setEndDate] = useState<Date | undefined>(to ? new Date(to) : new Date());

  useEffect(() => {
    setStartDate(from ? new Date(from) : addDays(new Date(), -30));
    setEndDate(to ? new Date(to) : new Date());
  }, [from, to]);

  function handleStartChange(date?: Date) {
    setStartDate(date);
    onChange(date, endDate);
  }

  function handleEndChange(date?: Date) {
    setEndDate(date);
    onChange(startDate, date);
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DatePicker
        date={startDate}
        setDate={handleStartChange}
        placeholder={startPlaceholder}
        className="w-[140px]"
      />
      <span className="mx-2">to</span>
      <DatePicker
        date={endDate}
        setDate={handleEndChange}
        placeholder={endPlaceholder}
        className="w-[140px]"
      />
    </div>
  );
} 