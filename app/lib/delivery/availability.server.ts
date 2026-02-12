/**
 * Core availability logic: cutoff, max days ahead, weekends, blackouts, capacity.
 * All times in shop timezone; product overrides (cutoff_hours, max_days_ahead, daily_capacity) override global.
 */
import { getGlobalSettings } from "./settings.server";
import { getBlackoutDates, isDateBlackedOut } from "./blackout.server";
import { getDeliveryCountForDate } from "./capacity.server";

export interface ProductOverrides {
  enabled?: boolean | null;
  cutoffHours?: number | null;
  maxDaysAhead?: number | null;
  dailyCapacity?: number | null;
}

export interface AvailabilityInput {
  shop: string;
  productOverrides?: ProductOverrides | null;
  /** Current time in ISO string (UTC); we convert to shop TZ for cutoff. */
  now?: Date;
}

export interface AvailabilityResult {
  availableDates: string[];
  excludedDates: string[];
  nextValidDate: string | null;
  /** Reason a date is excluded: blackout | capacity | cutoff | weekend | max_days */
  excludedReasons: Record<string, string>;
}

/** Parse "14:00" into hours and minutes in minutes-since-midnight. */
function parseCutoffTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map((s) => parseInt(s ?? "0", 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Get cutoff in minutes from midnight (shop TZ). Product override: cutoff_hours = hour of day (e.g. 14 = 2pm). */
function getCutoffMinutes(
  settings: { defaultCutoffTime: string },
  overrides: ProductOverrides | null | undefined
): number {
  if (overrides?.cutoffHours != null) {
    return overrides.cutoffHours * 60;
  }
  return parseCutoffTime(settings.defaultCutoffTime);
}

/** Format date as YYYY-MM-DD in a given TZ. */
function formatDateInTZ(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Get now in shop TZ as minutes since midnight (local day). */
function getMinutesSinceMidnightInTZ(date: Date, tz: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return hour * 60 + minute;
}

/** Add days in shop TZ (avoid DST issues by working in UTC and re-interpreting). */
function addDaysInTZ(dateStr: string, days: number, tz: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const d0 = new Date(Date.UTC(y!, m! - 1, d!));
  d0.setUTCDate(d0.getUTCDate() + days);
  return formatDateInTZ(d0, tz);
}

/** Is Saturday or Sunday in TZ? */
function isWeekend(dateStr: string, tz: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(date);
  return day === "Sat" || day === "Sun";
}

export async function computeAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
  const { shop, productOverrides = null, now = new Date() } = input;
  const [settings, blackoutRows] = await Promise.all([
    getGlobalSettings(shop),
    getBlackoutDates(shop),
  ]);

  const maxDaysAhead = productOverrides?.maxDaysAhead ?? settings.defaultMaxDaysAhead;
  const dailyCapacity = productOverrides?.dailyCapacity ?? settings.defaultDailyCapacity;
  const cutoffMinutes = getCutoffMinutes(settings, productOverrides);
  const tz = settings.timezone;

  const todayStr = formatDateInTZ(now, tz);
  const minutesNow = getMinutesSinceMidnightInTZ(now, tz);
  const pastCutoffToday = minutesNow >= cutoffMinutes;

  const excludedReasons: Record<string, string> = {};
  const excludedSet = new Set<string>();
  const availableDates: string[] = [];

  // Build list of candidate dates from today (or tomorrow if past cutoff) up to maxDaysAhead
  let startDateStr = todayStr;
  if (pastCutoffToday) {
    startDateStr = addDaysInTZ(todayStr, 1, tz);
    excludedReasons[todayStr] = "Ordering window closed for today";
    excludedSet.add(todayStr);
  }

  let currentStr = startDateStr;
  let daysChecked = 0;
  let nextValidDate: string | null = null;

  while (daysChecked <= maxDaysAhead) {
    if (isDateBlackedOut(currentStr, blackoutRows)) {
      excludedReasons[currentStr] = "Blackout date";
      excludedSet.add(currentStr);
      if (!nextValidDate) nextValidDate = null; // keep looking
    } else if (!settings.enableWeekendDelivery && isWeekend(currentStr, tz)) {
      excludedReasons[currentStr] = "Weekend delivery disabled";
      excludedSet.add(currentStr);
    } else {
      const count = await getDeliveryCountForDate(shop, currentStr);
      if (count >= dailyCapacity) {
        excludedReasons[currentStr] = "This date is fully booked";
        excludedSet.add(currentStr);
      } else {
        availableDates.push(currentStr);
        if (nextValidDate === null) nextValidDate = currentStr;
      }
    }
    daysChecked++;
    currentStr = addDaysInTZ(currentStr, 1, tz);
  }

  return {
    availableDates,
    excludedDates: [...excludedSet],
    nextValidDate,
    excludedReasons,
  };
}
