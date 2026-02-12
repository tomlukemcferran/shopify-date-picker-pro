/**
 * Webhook: app/scopes_update
 * Acknowledge scopes update from Shopify.
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  await authenticate.webhook(request);
  return new Response("OK", { status: 200 });
};
