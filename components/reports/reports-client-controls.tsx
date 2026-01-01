"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { useState, useEffect } from "react";
import { addDays } from "date-fns";

export default function ReportsClientControls({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState<Date | undefined>(from ? new Date(from) : addDays(new Date(), -30));
  const [endDate, setEndDate] = useState<Date | undefined>(to ? new Date(to) : new Date());

  useEffect(() => {
    setStartDate(from ? new Date(from) : addDays(new Date(), -30));
    setEndDate(to ? new Date(to) : new Date());
    // eslint-disable-next-line
  }, [from, to]);

  function handleDateChange(newStart?: Date, newEnd?: Date) {
    const params = new URLSearchParams(searchParams.toString());
    if (newStart) params.set("from", newStart.toISOString().split("T")[0]);
    if (newEnd) params.set("to", newEnd.toISOString().split("T")[0]);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div>
        <h1 className="text-3xl font-bold">Profit & Loss Statement</h1>
        <div className="text-muted-foreground">Financial performance for the selected period</div>
      </div>
      <div className="flex items-center gap-2">
        <DatePicker
          date={startDate}
          setDate={(date) => {
            setStartDate(date);
            handleDateChange(date, endDate);
          }}
          placeholder="Start date"
          className="w-[140px]"
        />
        <span className="mx-2">to</span>
        <DatePicker
          date={endDate}
          setDate={(date) => {
            setEndDate(date);
            handleDateChange(startDate, date);
          }}
          placeholder="End date"
          className="w-[140px]"
        />
      </div>
    </div>
  );
} 