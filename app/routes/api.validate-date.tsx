/**
 * API route: validate selected delivery date before checkout.
 * Called by theme extension or cart to ensure the selected date is still available
 * (prevents manual date manipulation). Returns 200 + { valid: true } or 400 + { valid: false, reason }.
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getGlobalSettings } from "~/lib/delivery/settings.server";
import { isDateBlackedOut } from "~/lib/delivery/blackout.server";
import { getDeliveryCountForDate } from "~/lib/delivery/capacity.server";
import { getProductDeliveryOverrides } from "~/lib/delivery/metafields.server";
import { getBlackoutDates } from "~/lib/delivery/blackout.server";

function formatDateInTZ(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getMinutesSinceMidnightInTZ(date: Date, tz: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10
  );
  return hour * 60 + minute;
}

function parseCutoffTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map((s) => parseInt(s ?? "0", 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

function isWeekend(dateStr: string, tz: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(date);
  return day === "Sat" || day === "Sun";
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ valid: false, reason: "Method not allowed" }, { status: 405 });
  }
  let body: { shop: string; deliveryDate: string; productId?: string };
  try {
    body = await request.json();
  } catch {
    return json(
      { valid: false, reason: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const { shop, deliveryDate, productId } = body;
  if (!shop || !deliveryDate) {
    return json(
      { valid: false, reason: "Missing shop or deliveryDate" },
      { status: 400 }
    );
  }
  const normalizedShop = shop.includes(".")
    ? shop
    : `${shop}.myshopify.com`;
  const settings = await getGlobalSettings(normalizedShop);
  const blackouts = await getBlackoutDates(normalizedShop);
  const now = new Date();
  const todayStr = formatDateInTZ(now, settings.timezone);
  let overrides: Awaited<ReturnType<typeof getProductDeliveryOverrides>> = null;
  if (productId) {
    overrides = await getProductDeliveryOverrides(normalizedShop, String(productId));
  }
  const cutoffMinutes =
    overrides?.cutoffHours != null
      ? overrides.cutoffHours * 60
      : parseCutoffTime(settings.defaultCutoffTime);
  const minutesNow = getMinutesSinceMidnightInTZ(now, settings.timezone);
  const maxDaysAhead = overrides?.maxDaysAhead ?? settings.defaultMaxDaysAhead;
  const dailyCapacity = overrides?.dailyCapacity ?? settings.defaultDailyCapacity;

  if (deliveryDate === todayStr && minutesNow >= cutoffMinutes) {
    return json({
      valid: false,
      reason: "Ordering window closed for today",
    });
  }
  if (isDateBlackedOut(deliveryDate, blackouts)) {
    return json({ valid: false, reason: "Blackout date" });
  }
  if (!settings.enableWeekendDelivery && isWeekend(deliveryDate, settings.timezone)) {
    return json({ valid: false, reason: "Weekend delivery disabled" });
  }
  const count = await getDeliveryCountForDate(normalizedShop, deliveryDate);
  if (count >= dailyCapacity) {
    return json({ valid: false, reason: "This date is fully booked" });
  }
  const [y, m, d] = deliveryDate.split("-").map(Number);
  const selected = new Date(Date.UTC(y!, m! - 1, d!));
  const today = new Date(Date.UTC(
    parseInt(todayStr.split("-")[0]!, 10),
    parseInt(todayStr.split("-")[1]!, 10) - 1,
    parseInt(todayStr.split("-")[2]!, 10)
  ));
  const daysDiff = Math.floor(
    (selected.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (daysDiff > maxDaysAhead) {
    return json({
      valid: false,
      reason: "Date is beyond the maximum allowed days ahead",
    });
  }
  if (daysDiff < 0) {
    return json({ valid: false, reason: "Date is in the past" });
  }
  return json({ valid: true });
};
