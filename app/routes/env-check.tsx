import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

/**
 * GET /env-check - Reports which required env vars are set (values never exposed).
 * Use this to debug 401s: if SHOPIFY_API_SECRET is false, JWT/session validation will fail.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const required = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET",
    "SHOPIFY_APP_URL",
    "DATABASE_URL",
  ] as const;
  const env: Record<string, boolean> = {};
  for (const key of required) {
    const raw = process.env[key];
    env[key] = Boolean(raw && String(raw).trim().length > 0);
  }
  return json(env, {
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
};
