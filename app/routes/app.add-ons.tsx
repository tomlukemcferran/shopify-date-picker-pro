import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Box,
  List,
  Badge,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";
import { authenticate } from "~/shopify.server";
import {
  getAllAddOns,
  createAddOn,
  updateAddOn,
  deleteAddOn,
} from "~/lib/delivery/addons.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const addOns = await getAllAddOns(session.shop);
  return { addOns };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;

  if (intent === "create") {
    const name = (formData.get("name") as string)?.trim();
    const price = parseFloat((formData.get("price") as string) ?? "0");
    const variantId = (formData.get("variantId") as string)?.trim();
    if (name && variantId) {
      await createAddOn(shop, { name, price, variantId });
    }
    return { ok: true };
  }

  if (intent === "update") {
    const id = formData.get("id") as string;
    const nameRaw = formData.get("name");
    const priceRaw = formData.get("price");
    const variantIdRaw = formData.get("variantId");
    const activeRaw = formData.get("active");
    if (id) {
      const updates: Parameters<typeof updateAddOn>[2] = {};
      if (typeof nameRaw === "string" && nameRaw.trim() !== "") updates.name = nameRaw.trim();
      if (priceRaw !== null && priceRaw !== undefined && String(priceRaw).trim() !== "") updates.price = parseFloat(String(priceRaw));
      if (typeof variantIdRaw === "string" && variantIdRaw.trim() !== "") updates.variantId = variantIdRaw.trim();
      if (activeRaw !== null && activeRaw !== undefined) updates.active = activeRaw === "on";
      if (Object.keys(updates).length > 0) await updateAddOn(shop, id, updates);
    }
    return { ok: true };
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    if (id) await deleteAddOn(shop, id);
    return { ok: true };
  }

  return { ok: false };
};

function formatMoney(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(price);
}

export default function AppAddOns() {
  const { addOns } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [variantId, setVariantId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editVariantId, setEditVariantId] = useState("");

  const handleCreate = useCallback(() => {
    if (!name.trim() || !variantId.trim()) return;
    const fd = new FormData();
    fd.set("intent", "create");
    fd.set("name", name.trim());
    fd.set("price", price || "0");
    fd.set("variantId", variantId.trim());
    submit(fd, { method: "post" });
    setName("");
    setPrice("");
    setVariantId("");
  }, [name, price, variantId, submit]);

  const handleStartEdit = useCallback(
    (addOn: { id: string; name: string; price: number; variantId: string }) => {
      setEditingId(addOn.id);
      setEditName(addOn.name);
      setEditPrice(String(addOn.price));
      setEditVariantId(addOn.variantId);
    },
    []
  );

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    const fd = new FormData();
    fd.set("intent", "update");
    fd.set("id", editingId);
    fd.set("name", editName.trim());
    fd.set("price", editPrice);
    fd.set("variantId", editVariantId.trim());
    submit(fd, { method: "post" });
    setEditingId(null);
  }, [editingId, editName, editPrice, editVariantId, submit]);

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm("Remove this add-on?")) return;
      const fd = new FormData();
      fd.set("intent", "delete");
      fd.set("id", id);
      submit(fd, { method: "post" });
    },
    [submit]
  );

  const handleToggleActive = useCallback(
    (addOn: { id: string; active: boolean }) => {
      const fd = new FormData();
      fd.set("intent", "update");
      fd.set("id", addOn.id);
      fd.set("active", addOn.active ? "off" : "on");
      submit(fd, { method: "post" });
    },
    [submit]
  );

  return (
    <Page>
      <TitleBar title="Product add-ons" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Add new add-on
                </Text>
                <Text as="p" tone="subdued">
                  Add-ons appear under the delivery date selector. Each add-on must
                  be linked to a Shopify product variant (e.g. a product like
                  &quot;Additional meat pie&quot; with one variant). The
                  variant&apos;s price is what gets added to the cart when the
                  customer selects the add-on. Get the variant ID from your
                  product&apos;s Admin URL or from the product API (e.g.
                  gid://shopify/ProductVariant/123456789).
                </Text>
                <FormLayout>
                  <TextField
                    label="Display name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Additional meat pie"
                    autoComplete="off"
                  />
                  <TextField
                    label="Price (for display only; cart uses variant price)"
                    type="number"
                    value={price}
                    onChange={setPrice}
                    placeholder="5.00"
                    autoComplete="off"
                  />
                  <TextField
                    label="Variant ID (required)"
                    value={variantId}
                    onChange={setVariantId}
                    placeholder="gid://shopify/ProductVariant/123456789"
                    autoComplete="off"
                    helpText="The Shopify variant GID. Creating a product for the add-on ensures the correct price is charged."
                  />
                </FormLayout>
                <Button variant="primary" onClick={handleCreate} disabled={!name.trim() || !variantId.trim()}>
                  Add add-on
                </Button>
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Current add-ons
                  </Text>
                  {addOns.length === 0 ? (
                    <EmptyState
                      heading="No add-ons yet"
                      image=""
                      action={{ content: "Add one above", onAction: () => {} }}
                    >
                      <p>Add-ons appear under the date picker on the product page. Create a product in Shopify for each add-on (e.g. &quot;Additional meat pie&quot;) and link it here by variant ID.</p>
                    </EmptyState>
                  ) : (
                    <List type="bullet">
                      {addOns.map((addOn) => (
                        <List.Item key={addOn.id}>
                          <BlockStack gap="200">
                            <InlineStack gap="200" blockAlign="center">
                              {editingId === addOn.id ? (
                                <>
                                  <TextField
                                    label=""
                                    value={editName}
                                    onChange={setEditName}
                                    autoComplete="off"
                                    labelHidden
                                  />
                                  <TextField
                                    label=""
                                    value={editPrice}
                                    onChange={setEditPrice}
                                    type="number"
                                    autoComplete="off"
                                    labelHidden
                                  />
                                  <TextField
                                    label=""
                                    value={editVariantId}
                                    onChange={setEditVariantId}
                                    autoComplete="off"
                                    labelHidden
                                  />
                                  <Button size="slim" onClick={handleSaveEdit}>
                                    Save
                                  </Button>
                                  <Button size="slim" onClick={() => setEditingId(null)}>
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Text as="span" fontWeight="semibold">
                                    {addOn.name}
                                  </Text>
                                  <Text as="span" tone="subdued">
                                    {formatMoney(addOn.price)}
                                  </Text>
                                  {!addOn.active && (
                                    <Badge tone="critical">Inactive</Badge>
                                  )}
                                  <Button
                                    size="slim"
                                    variant="plain"
                                    onClick={() => handleStartEdit(addOn)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="slim"
                                    variant="plain"
                                    tone="critical"
                                    onClick={() => handleDelete(addOn.id)}
                                  >
                                    Remove
                                  </Button>
                                  <Button
                                    size="slim"
                                    variant="plain"
                                    onClick={() => handleToggleActive(addOn)}
                                  >
                                    {addOn.active ? "Deactivate" : "Activate"}
                                  </Button>
                                </>
                              )}
                            </InlineStack>
                            {editingId !== addOn.id && (
                              <Text as="span" variant="bodySm" tone="subdued">
                                Variant: {addOn.variantId}
                              </Text>
                            )}
                          </BlockStack>
                        </List.Item>
                      ))}
                    </List>
                  )}
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
