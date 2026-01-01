"use client";
import { useRouter, useSearchParams } from "next/navigation";
import DateRangeControls from "@/components/ui/date-range-controls";

export default function SalesClientControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  function handleChange(newFrom?: Date, newTo?: Date) {
    const params = new URLSearchParams(searchParams.toString());
    if (newFrom) params.set("from", newFrom.toISOString().split("T")[0]);
    else params.delete("from");
    if (newTo) params.set("to", newTo.toISOString().split("T")[0]);
    else params.delete("to");
    router.push(`?${params.toString()}`);
  }

  return (
    <DateRangeControls
      from={from}
      to={to}
      onChange={handleChange}
    />
  );
} 