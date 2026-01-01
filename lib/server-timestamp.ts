import { createBusinessTimezoneDate } from "./timezone";

/**
 * Get current timestamp in business timezone for server-side operations
 * This should be used in all API endpoints when creating/updating records
 */
export async function getServerTimestamp(): Promise<Date> {
  return await createBusinessTimezoneDate();
}

/**
 * Convert a date to business timezone string format for database storage
 */
export async function formatTimestampForDB(date?: Date): Promise<Date> {
  return await createBusinessTimezoneDate(date);
}
