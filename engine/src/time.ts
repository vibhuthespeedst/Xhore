/**
 * Time helpers. The engine never reads the system clock: every instant it
 * works with arrives as an ISO string argument, which is what lets the
 * prototype skip ahead a week and the server replay the same maths.
 */
export const MS_PER_DAY = 86_400_000

export function toTime(iso: string): number {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) {
    throw new Error(`Invalid ISO timestamp: ${iso}`)
  }
  return time
}

/** Whole and fractional days from one instant to another. Negative if `toIso` is earlier. */
export function daysBetween(fromIso: string, toIso: string): number {
  return (toTime(toIso) - toTime(fromIso)) / MS_PER_DAY
}

/** Inclusive on both ends, so a session logged exactly at week end still counts. */
export function isWithin(iso: string, startIso: string, endIso: string): boolean {
  const time = toTime(iso)
  return time >= toTime(startIso) && time <= toTime(endIso)
}

export function addDays(iso: string, days: number): string {
  return new Date(toTime(iso) + days * MS_PER_DAY).toISOString()
}
