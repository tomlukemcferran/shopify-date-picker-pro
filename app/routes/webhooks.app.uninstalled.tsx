/**
 * Webhook: app/uninstalled
 * Acknowledge uninstall; optionally clean up shop data (session storage handles session cleanup).
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
