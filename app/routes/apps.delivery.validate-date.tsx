/**
 * App Proxy POST: validate selected delivery date (storefront calls this before checkout).
 * Query params include shop, signature, timestamp (Shopify adds for proxy). Body: { deliveryDate, productId? }.
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { verifyAppProxyHmac, getShopFromProxyQuery } from "~/lib/app-proxy.server";
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
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries()) as Record<
    string,
    string
  >;
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !verifyAppProxyHmac(query, secret)) {
    return json({ valid: false, reason: "Invalid signature" }, { status: 401 });
  }
  const shop = getShopFromProxyQuery(query);
  if (!shop) {
    return json({ valid: false, reason: "Missing shop" }, { status: 400 });
  }
  let body: { deliveryDate?: string; productId?: string };
  try {
    body = await request.json();
  } catch {
    return json(
      { valid: false, reason: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const deliveryDate = body.deliveryDate;
  const productId = body.productId;
  if (!deliveryDate) {
    return json(
      { valid: false, reason: "Missing deliveryDate" },
      { status: 400 }
    );
  }
  const settings = await getGlobalSettings(shop);
  const blackouts = await getBlackoutDates(shop);
  const now = new Date();
  const todayStr = formatDateInTZ(now, settings.timezone);
  let cutoffMinutes = parseCutoffTime(settings.defaultCutoffTime);
  let maxDaysAhead = settings.defaultMaxDaysAhead;
  let dailyCapacity = settings.defaultDailyCapacity;
  if (productId) {
    const overrides = await getProductDeliveryOverrides(shop, String(productId));
    if (overrides?.cutoffHours != null) cutoffMinutes = overrides.cutoffHours * 60;
    if (overrides?.maxDaysAhead != null) maxDaysAhead = overrides.maxDaysAhead;
    if (overrides?.dailyCapacity != null) dailyCapacity = overrides.dailyCapacity;
  }
  const minutesNow = getMinutesSinceMidnightInTZ(now, settings.timezone);
  if (deliveryDate === todayStr && minutesNow >= cutoffMinutes) {
    return json({
      valid: false,
      reason: "Ordering window closed for today",
    });
  }
  if (isDateBlackedOut(deliveryDate, blackouts)) {
    return json({ valid: false, reason: "Blackout date" });
  }
  if (
    !settings.enableWeekendDelivery &&
    isWeekend(deliveryDate, settings.timezone)
  ) {
    return json({
      valid: false,
      reason: "Weekend delivery disabled",
    });
  }
  const count = await getDeliveryCountForDate(shop, deliveryDate);
  if (count >= dailyCapacity) {
    return json({
      valid: false,
      reason: "This date is fully booked",
    });
  }
  const [y, m, d] = deliveryDate.split("-").map(Number);
  const selected = new Date(Date.UTC(y!, m! - 1, d!));
  const todayParts = todayStr.split("-").map(Number);
  const today = new Date(
    Date.UTC(todayParts[0]!, todayParts[1]! - 1, todayParts[2]!)
  );
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
