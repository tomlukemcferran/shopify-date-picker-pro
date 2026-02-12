/**
 * Load or create GlobalSettings for a shop.
 * Used by admin UI and by app proxy/API to get cutoff, capacity, timezone, blackouts.
 */
import prisma from "~/db.server";

export interface GlobalSettingsData {
  defaultCutoffTime: string;
  defaultDailyCapacity: number;
  defaultMaxDaysAhead: number;
  enableWeekendDelivery: boolean;
  timezone: string;
  showOnCartPage: boolean;
}

const DEFAULTS: GlobalSettingsData = {
  defaultCutoffTime: "14:00",
  defaultDailyCapacity: 50,
  defaultMaxDaysAhead: 30,
  enableWeekendDelivery: false,
  timezone: "UTC",
  showOnCartPage: false,
};

export async function getGlobalSettings(shop: string): Promise<GlobalSettingsData> {
  const row = await prisma.globalSettings.findUnique({ where: { shop } });
  if (!row) return DEFAULTS;
  return {
    defaultCutoffTime: row.defaultCutoffTime,
    defaultDailyCapacity: row.defaultDailyCapacity,
    defaultMaxDaysAhead: row.defaultMaxDaysAhead,
    enableWeekendDelivery: row.enableWeekendDelivery,
    timezone: row.timezone,
    showOnCartPage: row.showOnCartPage,
  };
}

export async function upsertGlobalSettings(
  shop: string,
  data: Partial<GlobalSettingsData>
): Promise<GlobalSettingsData> {
  const existing = await prisma.globalSettings.findUnique({ where: { shop } });
  const payload = {
    defaultCutoffTime: data.defaultCutoffTime ?? existing?.defaultCutoffTime ?? DEFAULTS.defaultCutoffTime,
    defaultDailyCapacity: data.defaultDailyCapacity ?? existing?.defaultDailyCapacity ?? DEFAULTS.defaultDailyCapacity,
    defaultMaxDaysAhead: data.defaultMaxDaysAhead ?? existing?.defaultMaxDaysAhead ?? DEFAULTS.defaultMaxDaysAhead,
    enableWeekendDelivery: data.enableWeekendDelivery ?? existing?.enableWeekendDelivery ?? DEFAULTS.enableWeekendDelivery,
    timezone: data.timezone ?? existing?.timezone ?? DEFAULTS.timezone,
    showOnCartPage: data.showOnCartPage ?? existing?.showOnCartPage ?? DEFAULTS.showOnCartPage,
  };
  await prisma.globalSettings.upsert({
    where: { shop },
    create: { shop, ...payload },
    update: payload,
  });
  return payload;
}
