const IST_MS = 330 * 60_000;
/** Start of the current day in India Standard Time (UTC+5:30), as a UTC Date. Used for "today" metrics. */
export function startOfTodayIST(now = new Date()): Date {
  const d = new Date(now.getTime() + IST_MS);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - IST_MS);
}
