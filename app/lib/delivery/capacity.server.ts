/**
 * Capacity: count orders with a given delivery date (from order tags Delivery-YYYY-MM-DD)
 * and compare to daily capacity. Used for app proxy and validate-date.
 * Requires Shopify Admin API to count orders by tag (or we store order counts in DB).
 * For production we use Orders API with tag filter; for simplicity we can store
 * delivery date counts in DB and update via orders/create webhook.
 */
import prisma from "~/db.server";

// Optional: store daily counts in DB updated by webhook for fast proxy responses.
// Model: DeliveryDayCount { shop, date (YYYY-MM-DD), count }
// For MVP we skip this and count via API in webhook/validate; proxy can call an internal
// endpoint or we add a simple DeliveryDayCount model.

// Add to Prisma schema and run migration:
// model DeliveryDayCount {
//   id    String @id @default(cuid())
//   shop  String
//   date  String   // YYYY-MM-DD
//   count Int      @default(0)
//   @@unique([shop, date])
//   @@index([shop])
// }

// For now we export a function that the app will use with Admin API order count by tag.
// The orders/create webhook will increment count; we need the model.

// We'll add DeliveryDayCount to schema and implement increment in webhook.
export async function getDeliveryCountForDate(
  shop: string,
  date: string
): Promise<number> {
  const row = await prisma.deliveryDayCount.findUnique({
    where: { shop_date: { shop, date } },
  });
  return row?.count ?? 0;
}

export async function incrementDeliveryCount(shop: string, date: string): Promise<void> {
  await prisma.deliveryDayCount.upsert({
    where: { shop_date: { shop, date } },
    create: { shop, date, count: 1 },
    update: { count: { increment: 1 } },
  });
}
