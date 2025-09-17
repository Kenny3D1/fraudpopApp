// ==============================
// app/routes/app.settings.jsx
// ==============================
import { json } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  TextField,
  Checkbox,
  Button,
  Banner,
  Box,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

const DEFAULTS = {
  redThreshold: 80,
  amberThreshold: 60,
  autoTagging: true,
  tagRed: "FraudPop: Red",
  tagAmber: "FraudPop: Amber",
  tagGreen: "FraudPop: Green",
  autoHoldRed: false,
  notifyEmail: "",
};

export async function loader({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // (Optional) show whether core metafields exist
  const DEFN_QUERY = `#graphql
    query {
      metafieldDefinitions(first: 10, ownerType: ORDER, namespace: "fraudpop") {
        edges { node { id key namespace } }
      }
    }
  `;
  const resp = await admin.graphql(DEFN_QUERY);
  const body = await resp.json();
  const defs =
    body?.data?.metafieldDefinitions?.edges?.map((e) => e.node) || [];
  const haveRisk = defs.some((d) => d.key === "risk");
  const haveEvidence = defs.some((d) => d.key === "evidence_ref");

  return json({ shopDomain, haveRisk, haveEvidence, defaults: DEFAULTS });
}

export async function action({ request }) {
  // Frontend-only stub: we just echo the submitted values so the UI can show a success banner
  const fd = await request.formData();
  const config = Object.fromEntries(fd);
  return json({ ok: true, config });
}

export default function SettingsPage() {
  const { shopDomain, haveRisk, haveEvidence, defaults } = useLoaderData();
  const actionData = useActionData();

  const [redThreshold, setRed] = React.useState(Number(defaults.redThreshold));
  const [amberThreshold, setAmber] = React.useState(
    Number(defaults.amberThreshold),
  );
  const [autoTagging, setAutoTagging] = React.useState(
    Boolean(defaults.autoTagging),
  );
  const [autoHoldRed, setAutoHoldRed] = React.useState(
    Boolean(defaults.autoHoldRed),
  );
  const [tagRed, setTagRed] = React.useState(defaults.tagRed);
  const [tagAmber, setTagAmber] = React.useState(defaults.tagAmber);
  const [tagGreen, setTagGreen] = React.useState(defaults.tagGreen);
  const [notifyEmail, setNotifyEmail] = React.useState(defaults.notifyEmail);

  const reset = () => {
    setRed(defaults.redThreshold);
    setAmber(defaults.amberThreshold);
    setAutoTagging(defaults.autoTagging);
    setAutoHoldRed(defaults.autoHoldRed);
    setTagRed(defaults.tagRed);
    setTagAmber(defaults.tagAmber);
    setTagGreen(defaults.tagGreen);
    setNotifyEmail(defaults.notifyEmail);
  };

  return (
    <Page title="Settings" subtitle={`Shop: ${shopDomain}`}>
      <Layout>
        <Layout.Section>
          {!haveRisk || !haveEvidence ? (
            <Banner tone="warning" title="Required metafields missing">
              <p>
                Some FraudPop metafields are not defined yet (
                {!haveRisk ? "risk" : ""}
                {!haveRisk && !haveEvidence ? ", " : ""}
                {!haveEvidence ? "evidence_ref" : ""}). Ensure your installation
                step created them.
              </p>
            </Banner>
          ) : null}
        </Layout.Section>

        <Layout.Section>
          {actionData?.ok ? (
            <Banner tone="success" title="Settings saved (stub)">
              <p>
                This UI saved locally for demo. Wire this form to your action to
                persist in your backend or AppInstallation metafield.
              </p>
            </Banner>
          ) : null}
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Risk thresholds
                </Text>
                <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
                  <TextField
                    label="Red threshold (0–100)"
                    type="number"
                    min={0}
                    max={100}
                    value={String(redThreshold)}
                    onChange={(v) => setRed(Number(v))}
                    helpText="Orders at or above this score are High risk"
                  />
                  <TextField
                    label="Amber threshold (0–100)"
                    type="number"
                    min={0}
                    max={100}
                    value={String(amberThreshold)}
                    onChange={(v) => setAmber(Number(v))}
                    helpText="Orders between amber and red are Medium risk"
                  />
                </InlineGrid>
              </BlockStack>
            </Box>
            <Divider />
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Tags & automation
                </Text>
                <Checkbox
                  label="Auto-apply tags on score"
                  checked={autoTagging}
                  onChange={setAutoTagging}
                />
                <Checkbox
                  label="Auto-hold High risk orders"
                  checked={autoHoldRed}
                  onChange={setAutoHoldRed}
                />
                <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
                  <TextField
                    label="High risk tag"
                    value={tagRed}
                    onChange={setTagRed}
                  />
                  <TextField
                    label="Medium risk tag"
                    value={tagAmber}
                    onChange={setTagAmber}
                  />
                  <TextField
                    label="Low risk tag"
                    value={tagGreen}
                    onChange={setTagGreen}
                  />
                </InlineGrid>
              </BlockStack>
            </Box>
            <Divider />
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Notifications
                </Text>
                <TextField
                  label="Alert email (optional)"
                  type="email"
                  value={notifyEmail}
                  onChange={setNotifyEmail}
                  placeholder="risk@yourbrand.com"
                />
              </BlockStack>
            </Box>
            <Divider />
            <Box padding="400">
              <form method="post">
                {/* Submit all fields as a simple form payload */}
                <input type="hidden" name="redThreshold" value={redThreshold} />
                <input
                  type="hidden"
                  name="amberThreshold"
                  value={amberThreshold}
                />
                <input type="hidden" name="autoTagging" value={autoTagging} />
                <input type="hidden" name="autoHoldRed" value={autoHoldRed} />
                <input type="hidden" name="tagRed" value={tagRed} />
                <input type="hidden" name="tagAmber" value={tagAmber} />
                <input type="hidden" name="tagGreen" value={tagGreen} />
                <input type="hidden" name="notifyEmail" value={notifyEmail} />
                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                  <Button submit primary>
                    Save settings
                  </Button>
                  <Button onClick={reset} variant="secondary">
                    Reset to defaults
                  </Button>
                </InlineGrid>
              </form>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
