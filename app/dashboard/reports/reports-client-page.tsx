'use client';

import { useState } from "react";
import { addDays } from "date-fns";
import { type DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-picker";
import ReportsPage from "./page";
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

export default function ReportsClientPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    const from = range?.from ? range.from.toISOString().split("T")[0] : undefined;
    const to = range?.to ? range.to.toISOString().split("T")[0] : undefined;
    
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Profit & Loss Statement</h1>
          <div className="text-muted-foreground">Financial performance for the selected period</div>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            dateRange={dateRange}
            setDateRange={handleDateChange}
            placeholder="Select date range"
            className="w-[280px] overflow-hidden"
          />
        </div>
      </div>
      <ReportsPage searchParams={{
        from: dateRange?.from ? dateRange.from.toISOString().split("T")[0] : undefined,
        to: dateRange?.to ? dateRange.to.toISOString().split("T")[0] : undefined,
      }} />
    </div>
  );
} 