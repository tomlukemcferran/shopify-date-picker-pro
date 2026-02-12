/**
 * App Proxy endpoint: /apps/delivery/available-dates
 * Storefront fetches from https://store.myshopify.com/apps/delivery/available-dates?shop=...&signature=...&timestamp=...&product_id=...
 * Shopify forwards to this route. We validate HMAC then return JSON availability.
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { verifyAppProxyHmac, getShopFromProxyQuery } from "~/lib/app-proxy.server";
import { computeAvailability } from "~/lib/delivery/availability.server";
import { getProductDeliveryOverrides } from "~/lib/delivery/metafields.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries()) as Record<string, string>;
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!verifyAppProxyHmac(query, secret)) {
    return json({ error: "Invalid signature" }, { status: 401 });
  }
  const shop = getShopFromProxyQuery(query);
  if (!shop) {
    return json({ error: "Missing shop" }, { status: 400 });
  }
  const productId = query.product_id ?? null;
  let productOverrides = null;
  if (productId) {
    productOverrides = await getProductDeliveryOverrides(shop, productId);
    if (productOverrides?.enabled === false) {
      return json({
        availableDates: [],
        excludedDates: [],
        nextValidDate: null,
        excludedReasons: {},
        message: "Delivery date picker is disabled for this product.",
      });
    }
  }
  const result = await computeAvailability({
    shop,
    productOverrides: productOverrides ?? undefined,
    now: new Date(),
  });
  return json({
    availableDates: result.availableDates,
    excludedDates: result.excludedDates,
    nextValidDate: result.nextValidDate,
    excludedReasons: result.excludedReasons,
  });
};
