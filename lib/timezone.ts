const BUSINESS_TIMEZONE = "Asia/Kolkata";

/**
 * Return the fixed business timezone (IST).
 */
export async function getBusinessTimezone(): Promise<string> {
  return BUSINESS_TIMEZONE;
}

/**
 * Convert a date into the business timezone context.
 * Since JS Dates are timezone-agnostic (UTC internally), we simply clone the date.
 */
export function toBusinessTimezone(date: Date, _timezone: string = BUSINESS_TIMEZONE): Date {
  return new Date(date);
}

/**
 * Current timestamp in the business timezone context.
 */
export async function getBusinessTimezoneNow(): Promise<Date> {
  return new Date();
}

/**
 * Format a date using the business timezone.
 */
export function formatDateInBusinessTimezone(
  date: Date,
  timezone: string = BUSINESS_TIMEZONE,
  format: "date" | "datetime" | "time" = "datetime"
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  switch (format) {
    case "date":
      options.year = "numeric";
      options.month = "2-digit";
      options.day = "2-digit";
      break;
    case "time":
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.second = "2-digit";
      options.hour12 = false;
      break;
    case "datetime":
    default:
      options.year = "numeric";
      options.month = "2-digit";
      options.day = "2-digit";
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.second = "2-digit";
      options.hour12 = false;
      break;
  }

  return new Intl.DateTimeFormat("en-IN", options).format(date);
}

/**
 * Create a timestamp aligned with business timezone expectations.
 */
export async function createBusinessTimezoneDate(date?: Date): Promise<Date> {
  return date ? new Date(date) : new Date();
}
