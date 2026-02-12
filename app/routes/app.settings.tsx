import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Checkbox,
  Select,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Box,
  Divider,
  List,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";
import { authenticate } from "~/shopify.server";
import {
  getGlobalSettings,
  upsertGlobalSettings,
  type GlobalSettingsData,
} from "~/lib/delivery/settings.server";
import {
  getBlackoutDates,
  addBlackout,
  removeBlackout,
} from "~/lib/delivery/blackout.server";
import prisma from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const [settings, blackouts] = await Promise.all([
    getGlobalSettings(shop),
    getBlackoutDates(shop),
  ]);
  const blackoutRows = await prisma.blackoutDate.findMany({
    where: { shop },
    orderBy: { date: "asc" },
  });
  return {
    settings,
    blackouts: blackoutRows,
    blackoutList: blackouts,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;

  if (intent === "save_global") {
    const defaultCutoffTime =
      (formData.get("defaultCutoffTime") as string) ?? "14:00";
    const defaultDailyCapacity = parseInt(
      (formData.get("defaultDailyCapacity") as string) ?? "50",
      10
    );
    const defaultMaxDaysAhead = parseInt(
      (formData.get("defaultMaxDaysAhead") as string) ?? "30",
      10
    );
    const enableWeekendDelivery =
      formData.get("enableWeekendDelivery") === "on";
    const timezone = (formData.get("timezone") as string) ?? "UTC";
    const showOnCartPage = formData.get("showOnCartPage") === "on";
    await upsertGlobalSettings(shop, {
      defaultCutoffTime,
      defaultDailyCapacity,
      defaultMaxDaysAhead,
      enableWeekendDelivery,
      timezone,
      showOnCartPage,
    });
    return { ok: true, message: "Global settings saved." };
  }

  if (intent === "add_blackout") {
    const date = formData.get("blackoutDate") as string;
    const recurring = formData.get("blackoutRecurring") === "on";
    const label = (formData.get("blackoutLabel") as string) || undefined;
    if (date) await addBlackout(shop, date, { recurring, label });
    return { ok: true, message: "Blackout date added." };
  }

  if (intent === "remove_blackout") {
    const id = formData.get("id") as string;
    if (id) await removeBlackout(shop, id);
    return { ok: true, message: "Blackout date removed." };
  }

  return { ok: false, message: "Unknown action." };
};

const TIMEZONES = Intl.supportedValuesOf
  ? Intl.supportedValuesOf("timeZone")
  : [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Europe/London",
      "Europe/Paris",
      "Asia/Tokyo",
      "Australia/Sydney",
    ];

export default function AppSettings() {
  const { settings, blackouts } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [cutoff, setCutoff] = useState(settings.defaultCutoffTime);
  const [capacity, setCapacity] = useState(String(settings.defaultDailyCapacity));
  const [maxDays, setMaxDays] = useState(String(settings.defaultMaxDaysAhead));
  const [weekends, setWeekends] = useState(settings.enableWeekendDelivery);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [showOnCart, setShowOnCart] = useState(settings.showOnCartPage);
  const [newBlackoutDate, setNewBlackoutDate] = useState("");
  const [newBlackoutRecurring, setNewBlackoutRecurring] = useState(false);
  const [newBlackoutLabel, setNewBlackoutLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveGlobal = useCallback(() => {
    setSaving(true);
    const fd = new FormData();
    fd.set("intent", "save_global");
    fd.set("defaultCutoffTime", cutoff);
    fd.set("defaultDailyCapacity", capacity);
    fd.set("defaultMaxDaysAhead", maxDays);
    fd.set("enableWeekendDelivery", weekends ? "on" : "off");
    fd.set("timezone", timezone);
    fd.set("showOnCartPage", showOnCart ? "on" : "off");
    submit(fd, { method: "post" });
    setSaving(false);
  }, [cutoff, capacity, maxDays, weekends, timezone, showOnCart, submit]);

  const handleAddBlackout = useCallback(() => {
    if (!newBlackoutDate) return;
    const fd = new FormData();
    fd.set("intent", "add_blackout");
    fd.set("blackoutDate", newBlackoutDate);
    fd.set("blackoutRecurring", newBlackoutRecurring ? "on" : "off");
    fd.set("blackoutLabel", newBlackoutLabel);
    submit(fd, { method: "post" });
    setNewBlackoutDate("");
    setNewBlackoutLabel("");
  }, [newBlackoutDate, newBlackoutRecurring, newBlackoutLabel, submit]);

  const handleRemoveBlackout = useCallback(
    (id: string) => {
      const fd = new FormData();
      fd.set("intent", "remove_blackout");
      fd.set("id", id);
      submit(fd, { method: "post" });
    },
    [submit]
  );

  const timezoneOptions = TIMEZONES.map((tz) => ({ label: tz, value: tz }));

  return (
    <Page>
      <TitleBar title="Delivery Date Pro — Settings" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Global settings
                </Text>
                <FormLayout>
                  <TextField
                    label="Default cutoff time"
                    type="text"
                    value={cutoff}
                    onChange={setCutoff}
                    helpText="Time (HH:MM) after which same-day delivery is disabled (shop timezone). E.g. 14:00 = 2pm."
                    autoComplete="off"
                  />
                  <TextField
                    label="Default daily capacity"
                    type="number"
                    value={capacity}
                    onChange={setCapacity}
                    helpText="Max orders per day for delivery; dates at capacity are shown as unavailable."
                    autoComplete="off"
                  />
                  <TextField
                    label="Default max days ahead"
                    type="number"
                    value={maxDays}
                    onChange={setMaxDays}
                    helpText="Customers cannot select a date more than this many days in the future."
                    autoComplete="off"
                  />
                  <Select
                    label="Timezone"
                    options={timezoneOptions}
                    value={timezone}
                    onChange={setTimezone}
                  />
                  <Checkbox
                    label="Enable weekend deliveries"
                    checked={weekends}
                    onChange={setWeekends}
                  />
                  <Checkbox
                    label="Show delivery date selector on Cart Page"
                    checked={showOnCart}
                    onChange={setShowOnCart}
                    helpText="When enabled, the date picker block can also be added to the cart page."
                  />
                </FormLayout>
                <Button variant="primary" onClick={handleSaveGlobal} loading={saving}>
                  Save global settings
                </Button>
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Blackout dates
                  </Text>
                  <Text as="p" tone="subdued">
                    Dates when delivery is not available. Add one-off dates or
                    recurring annual dates (e.g. Dec 25).
                  </Text>
                  <FormLayout>
                    <TextField
                      label="Date"
                      type="date"
                      value={newBlackoutDate}
                      onChange={setNewBlackoutDate}
                      autoComplete="off"
                    />
                    <TextField
                      label="Label (optional)"
                      type="text"
                      value={newBlackoutLabel}
                      onChange={setNewBlackoutLabel}
                      placeholder="e.g. Christmas Day"
                      autoComplete="off"
                    />
                    <Checkbox
                      label="Recurring (every year)"
                      checked={newBlackoutRecurring}
                      onChange={setNewBlackoutRecurring}
                    />
                  </FormLayout>
                  <Button onClick={handleAddBlackout} disabled={!newBlackoutDate}>
                    Add blackout date
                  </Button>
                  <Divider />
                  <Text as="h3" variant="headingSm">
                    Current blackout dates
                  </Text>
                  {blackouts.length === 0 ? (
                    <Text as="p" tone="subdued">
                      No blackout dates configured.
                    </Text>
                  ) : (
                    <List type="bullet">
                      {blackouts.map((b) => (
                        <List.Item key={b.id}>
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="span">
                              {b.date}
                              {b.recurring ? " (recurring)" : ""}
                              {b.label ? ` — ${b.label}` : ""}
                            </Text>
                            <Button
                              variant="plain"
                              tone="critical"
                              onClick={() => handleRemoveBlackout(b.id)}
                            >
                              Remove
                            </Button>
                          </InlineStack>
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
