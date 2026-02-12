import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Button,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function AppIndex() {
  return (
    <Page>
      <TitleBar title="Delivery Date Pro" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Welcome
                </Text>
                <Text as="p" tone="subdued">
                  Configure delivery date picker per product and manage global
                  settings, blackout dates, and capacity from the settings page.
                </Text>
                <InlineStack gap="300">
                  <Link to="/app/settings">
                    <Button variant="primary">Open delivery settings</Button>
                  </Link>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
