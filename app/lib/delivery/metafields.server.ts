/**
 * Product metafields for delivery date settings.
 * Namespace: delivery
 * Keys: enabled (boolean), cutoff_hours (number), max_days_ahead (number), daily_capacity (number)
 * When not set, app uses shop-level defaults. Values are cached in ProductDeliveryCache
 * and synced via products/update webhook.
 */
import prisma from "~/db.server";

export interface ProductDeliveryOverrides {
  enabled: boolean | null;
  cutoffHours: number | null;
  maxDaysAhead: number | null;
  dailyCapacity: number | null;
}

export async function getProductDeliveryOverrides(
  shop: string,
  productId: string
): Promise<ProductDeliveryOverrides | null> {
  const normalizedId = productId.replace("gid://shopify/Product/", "");
  const row = await prisma.productDeliveryCache.findUnique({
    where: { shop_productId: { shop, productId: normalizedId } },
  });
  if (!row)
    return null;
  return {
    enabled: row.enabled,
    cutoffHours: row.cutoffHours,
    maxDaysAhead: row.maxDaysAhead,
    dailyCapacity: row.dailyCapacity,
  };
}

/** Convert metafield values to overrides for availability. */
export function metafieldsToOverrides(m: {
  enabled?: boolean | null;
  cutoff_hours?: number | null;
  max_days_ahead?: number | null;
  daily_capacity?: number | null;
}): ProductDeliveryOverrides {
  return {
    enabled: m.enabled ?? null,
    cutoffHours: m.cutoff_hours ?? null,
    maxDaysAhead: m.max_days_ahead ?? null,
    dailyCapacity: m.daily_capacity ?? null,
  };
}

export async function setProductDeliveryCache(
  shop: string,
  productId: string,
  data: Partial<ProductDeliveryOverrides>
): Promise<void> {
  const normalizedId = productId.replace("gid://shopify/Product/", "");
  await prisma.productDeliveryCache.upsert({
    where: { shop_productId: { shop, productId: normalizedId } },
    create: {
      shop,
      productId: normalizedId,
      enabled: data.enabled ?? null,
      cutoffHours: data.cutoffHours ?? null,
      maxDaysAhead: data.maxDaysAhead ?? null,
      dailyCapacity: data.dailyCapacity ?? null,
    },
    update: {
      enabled: data.enabled ?? undefined,
      cutoffHours: data.cutoffHours ?? undefined,
      maxDaysAhead: data.maxDaysAhead ?? undefined,
      dailyCapacity: data.dailyCapacity ?? undefined,
    },
  });
}
