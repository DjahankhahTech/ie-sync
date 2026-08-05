// All cached AI products (adversary estimate, INFSUM summary, SIGMAN scan)
// publish ONCE per day, for everyone. The product day rolls over at 0500
// Eastern: before 0500 ET viewers keep the previous day's product, and the
// 10:00 UTC Vercel cron (0500 EST / 0600 EDT) generates the new day's product
// for all users. Nothing regenerates per user or per read.
export const DAILY_SLOT = "0500";

/** ET calendar date of the current product day (rolls over at 0500 ET). */
export function productDayET(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(
    new Date(Date.now() - 5 * 3_600_000)
  );
}
