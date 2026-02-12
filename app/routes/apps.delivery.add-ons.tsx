/**
 * App Proxy: GET /apps/delivery/add-ons
 * Returns active add-ons (name, price, variantId) for the storefront.
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { verifyAppProxyHmac, getShopFromProxyQuery } from "~/lib/app-proxy.server";
import { getActiveAddOns } from "~/lib/delivery/addons.server";

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
  const addOns = await getActiveAddOns(shop);
  return json({ addOns });
};
