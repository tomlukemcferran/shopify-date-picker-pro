/**
 * Verify Shopify App Proxy HMAC.
 * App proxy requests use sorted key=value concatenation with NO separator between pairs.
 * @see https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies
 */
import { createHmac } from "crypto";

export function verifyAppProxyHmac(query: Record<string, string>, secret: string): boolean {
  const hmac = query.signature;
  if (!hmac) return false;
  const sorted = Object.entries(query)
    .filter(([k]) => k !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("");
  const calculated = createHmac("sha256", secret).update(sorted).digest("hex");
  return calculated === hmac;
}

/** Get shop domain from proxy query (without .myshopify.com if present; normalize to .myshopify.com for session). */
export function getShopFromProxyQuery(query: Record<string, string>): string | null {
  const shop = query.shop ?? null;
  if (!shop) return null;
  return shop.includes(".") ? shop : `${shop}.myshopify.com`;
}
