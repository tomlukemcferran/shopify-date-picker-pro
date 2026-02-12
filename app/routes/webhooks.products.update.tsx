/**
 * Webhook: products/update
 * Sync product delivery metafields to ProductDeliveryCache so the app proxy can use them.
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { syncProductToCache } from "~/lib/delivery/metafield-definitions.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const { topic, shop, payload } = await authenticate.webhook(request);
  const topicNorm = String(topic).toLowerCase().replace("_", "/");
  if (!payload || topicNorm !== "products/update") {
    return new Response("OK", { status: 200 });
  }
  const product = payload as {
    id?: number;
    admin_graphql_api_id?: string;
    metafields?: Array<{ namespace?: string; key?: string; value?: string }>;
  };
  const productId = product.admin_graphql_api_id ?? (product.id ? `gid://shopify/Product/${product.id}` : null);
  const metafields = product.metafields ?? [];
  if (productId && metafields.length > 0) {
    await syncProductToCache(shop, productId, metafields);
  }
  return new Response("OK", { status: 200 });
};
