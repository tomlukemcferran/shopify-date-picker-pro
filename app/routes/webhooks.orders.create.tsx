/**
 * Webhook: orders/create
 * - Add order tag: Delivery-[YYYY-MM-DD] from line item property "Delivery Date"
 * - Add tag: Delivery-Date-Selected
 * - Increment DeliveryDayCount for that date (for capacity)
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { incrementDeliveryCount } from "~/lib/delivery/capacity.server";

const DELIVERY_DATE_PROPERTY = "Delivery Date";

function extractDeliveryDateFromOrder(order: {
  line_items?: Array<{ properties?: Array<{ name?: string; value?: string }> }>;
}): string | null {
  for (const item of order.line_items ?? []) {
    for (const prop of item.properties ?? []) {
      if (prop.name === DELIVERY_DATE_PROPERTY && prop.value) {
        const v = prop.value.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        return v;
      }
    }
  }
  return null;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const { topic, shop, payload, admin } = await authenticate.webhook(request);
  const topicNorm = String(topic).toLowerCase().replace("_", "/");
  if (!payload || topicNorm !== "orders/create") {
    return new Response("OK", { status: 200 });
  }
  const order = payload as {
    id?: number;
    admin_graphql_api_id?: string;
    line_items?: Array<{
      properties?: Array<{ name?: string; value?: string }>;
    }>;
    tags?: string;
  };
  const deliveryDate = extractDeliveryDateFromOrder(order);
  const tagsToAdd: string[] = [];
  if (deliveryDate) {
    tagsToAdd.push(`Delivery-${deliveryDate}`);
    tagsToAdd.push("Delivery-Date-Selected");
    await incrementDeliveryCount(shop, deliveryDate);
  }
  if (tagsToAdd.length === 0) return new Response("OK", { status: 200 });
  if (!admin) return new Response("OK", { status: 200 });
  const existingTags = (order.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const newTags = [...new Set([...existingTags, ...tagsToAdd])];
  const orderId = order.admin_graphql_api_id ?? `gid://shopify/Order/${order.id}`;
  const res = await admin.graphql(
    `mutation orderUpdate($input: OrderInput!) {
      orderUpdate(input: $input) {
        order { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        input: {
          id: orderId,
          tags: newTags,
        },
      },
    }
  );
  const json = await res.json();
  if (json.data?.orderUpdate?.userErrors?.length) {
    console.error("Order tag update errors:", json.data.orderUpdate.userErrors);
  }
  return new Response("OK", { status: 200 });
};
