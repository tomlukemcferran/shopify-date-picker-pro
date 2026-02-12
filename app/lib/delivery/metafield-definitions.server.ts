/**
 * Register product metafield definitions for Delivery Date Pro.
 * Namespace: delivery
 * Keys: enabled (boolean), cutoff_hours (number), max_days_ahead (number), daily_capacity (number)
 * Call from app install or from admin settings on first load.
 */
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { setProductDeliveryCache } from "./metafields.server";

const NAMESPACE = "delivery";
const DEFINITIONS = [
  {
    key: "enabled",
    name: "Delivery date picker enabled",
    type: "boolean",
    description: "Enable or disable the delivery date picker for this product.",
  },
  {
    key: "cutoff_hours",
    name: "Cutoff hour (same-day)",
    type: "number_integer",
    description: "Hour of day (0-23) after which same-day delivery is disabled. Overrides global setting.",
  },
  {
    key: "max_days_ahead",
    name: "Max days ahead",
    type: "number_integer",
    description: "Maximum days in the future a customer can select. Overrides global setting.",
  },
  {
    key: "daily_capacity",
    name: "Daily capacity",
    type: "number_integer",
    description: "Max orders per day for this product's delivery. Overrides global setting.",
  },
];

export async function registerDeliveryMetafieldDefinitions(
  admin: AdminApiContext
): Promise<void> {
  for (const def of DEFINITIONS) {
    await admin.graphql(
      `mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          definition: {
            name: def.name,
            namespace: NAMESPACE,
            key: def.key,
            type: def.type,
            description: def.description,
            ownerType: "PRODUCT",
          },
        },
      }
    );
  }
}

/**
 * Sync product metafields to ProductDeliveryCache (call from products/update webhook).
 */
export function parseProductDeliveryMetafields(metafields: Array<{ namespace?: string; key?: string; value?: string }>): {
  enabled: boolean | null;
  cutoffHours: number | null;
  maxDaysAhead: number | null;
  dailyCapacity: number | null;
} {
  const get = (key: string) => {
    const m = metafields.find((f) => f.namespace === NAMESPACE && f.key === key);
    if (m?.value == null) return null;
    if (key === "enabled") return m.value === "true";
    const n = parseInt(m.value, 10);
    return Number.isNaN(n) ? null : n;
  };
  return {
    enabled: get("enabled") as boolean | null,
    cutoffHours: get("cutoff_hours") as number | null,
    maxDaysAhead: get("max_days_ahead") as number | null,
    dailyCapacity: get("daily_capacity") as number | null,
  };
}

export async function syncProductToCache(
  shop: string,
  productId: string,
  metafields: Array<{ namespace?: string; key?: string; value?: string }>
): Promise<void> {
  const parsed = parseProductDeliveryMetafields(metafields);
  await setProductDeliveryCache(shop, productId, parsed);
}
