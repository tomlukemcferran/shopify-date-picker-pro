/**
 * Product add-ons: CRUD and list for storefront.
 * Add-ons are linked to a Shopify variant so selecting one adds that variant to cart (price comes from the product).
 */

import prisma from "~/db.server";

export interface AddOnPublic {
  id: string;
  name: string;
  price: number;
  variantId: string;
}

export async function getActiveAddOns(shop: string): Promise<AddOnPublic[]> {
  const rows = await prisma.addOn.findMany({
    where: { shop, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, price: true, variantId: true },
  });
  return rows;
}

export async function getAllAddOns(shop: string) {
  return prisma.addOn.findMany({
    where: { shop },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createAddOn(
  shop: string,
  data: { name: string; price: number; variantId: string; sortOrder?: number }
) {
  return prisma.addOn.create({
    data: {
      shop,
      name: data.name,
      price: data.price,
      variantId: data.variantId,
      sortOrder: data.sortOrder ?? 0,
      active: true,
    },
  });
}

export async function updateAddOn(
  shop: string,
  id: string,
  data: { name?: string; price?: number; variantId?: string; sortOrder?: number; active?: boolean }
) {
  return prisma.addOn.updateMany({
    where: { id, shop },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.price != null && { price: data.price }),
      ...(data.variantId != null && { variantId: data.variantId }),
      ...(data.sortOrder != null && { sortOrder: data.sortOrder }),
      ...(data.active != null && { active: data.active }),
    },
  });
}

export async function deleteAddOn(shop: string, id: string) {
  return prisma.addOn.deleteMany({ where: { id, shop } });
}
