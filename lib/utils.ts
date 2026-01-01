import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return value?.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }) ?? "₹0.00";
}

export function formatQuantity(value: number) {
  return value?.toLocaleString("en-IN") ?? "0";
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(d);
}
