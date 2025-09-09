import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, Form } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  Text,
  Checkbox,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

const READ_SETTINGS = `
  query ReadSettings {
    shop { metafield(namespace: "fraudpop", key: "settings") { value } }
  }
`;
const WRITE_SETTINGS = `
  mutation SaveSettings($value: JSON!) {
    metafieldsSet(metafields: [{
      namespace: "fraudpop", key: "settings", type: "json", ownerId: "gid://shopify/Shop/1", value: $value
    }]) { userErrors { field message } }
  }
`;

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(READ_SETTINGS);
  const data = await res.json();
  let settings = { enableAutoTagging: false, showTrafficLight: true };
  const raw = data?.data?.shop?.metafield?.value;
  if (raw) {
    try {
      settings = { ...settings, ...JSON.parse(raw) };
    } catch {}
  }
  return json({ settings });
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const fd = await request.formData();
  const enableAutoTagging = fd.get("enableAutoTagging") === "on";
  const showTrafficLight = fd.get("showTrafficLight") === "on";
  const value = JSON.stringify({ enableAutoTagging, showTrafficLight });

  const res = await admin.graphql(WRITE_SETTINGS, { variables: { value } });
  const data = await res.json();
  const err = data?.data?.metafieldsSet?.userErrors?.[0];
  if (err) return json({ ok: false, error: err.message }, { status: 400 });
  return redirect("/app/settings");
}

export default function SettingsPage() {
  const { settings } = useLoaderData();
  const action = useActionData();
  return (
    <Page title="Settings">
      <Card>
        <BlockStack gap="400" padding="400">
          <Text as="h2" variant="headingMd">
            FraudPop Settings
          </Text>
          <Form method="post">
            <BlockStack gap="300">
              <Checkbox
                label="Enable auto-tagging of flagged orders"
                checked={!!settings.enableAutoTagging}
                name="enableAutoTagging"
                onChange={() => {}}
              />
              <Checkbox
                label="Show traffic-light risk in the dashboard"
                checked={!!settings.showTrafficLight}
                name="showTrafficLight"
                onChange={() => {}}
              />
              {action && action.error && (
                <Text tone="critical">{String(action.error)}</Text>
              )}
              <InlineStack align="end">
                <Button submit>Save</Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </BlockStack>
      </Card>
    </Page>
  );
}
