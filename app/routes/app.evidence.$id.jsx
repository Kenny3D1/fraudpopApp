// ==============================
// app/routes/app.evidence.$id.jsx
// ==============================
import { json as json3 } from "@remix-run/node";
import { useLoaderData as useLoaderData3 } from "@remix-run/react";
import {
  Page as Page3,
  Layout as Layout3,
  Card as Card3,
  BlockStack as BlockStack3,
  Text as Text3,
  Badge as Badge3,
  Button as Button3,
  Box as Box3,
  InlineGrid as InlineGrid3,
} from "@shopify/polaris";
import { authenticate as authenticate3 } from "../shopify.server";

const ORDER_DETAIL = `#graphql
  query OrderDetail($id: ID!) {
    order(id: $id) {
      id
      name
      email
      createdAt
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      tags
      metafields(identifiers: [
        { namespace: "fraudpop", key: "risk" },
        { namespace: "fraudpop", key: "evidence_ref" },
        { namespace: "fraudpop", key: "version" }
      ]) { key namespace value }
    }
  }
`;

export async function loader({ params, request }) {
  const { admin, session } = await authenticate3.admin(request);
  const shopDomain = session.shop;
  const numeric = params.id;
  const gid = `gid://shopify/Order/${numeric}`;
  const resp = await admin.graphql(ORDER_DETAIL, { variables: { id: gid } });
  const body = await resp.json();
  const node = body?.data?.order;

  const money = node?.currentTotalPriceSet?.shopMoney;
  const total = money
    ? `${Number(money.amount).toFixed(2)} ${money.currencyCode}`
    : "—";
  const mfs = Object.fromEntries(
    (node?.metafields || []).map((m) => [m.key, m.value]),
  );

  let risk = { verdict: "green", reasons: [], score: 0 };
  if (mfs.risk) {
    try {
      const parsed = JSON.parse(mfs.risk);
      risk = {
        verdict: parsed.verdict || "green",
        reasons: parsed.reasons || [],
        score: parsed.score || 0,
        signals: parsed.signals || undefined,
        model: parsed.model || undefined,
      };
    } catch {}
  }

  return json3({
    shopDomain,
    id: numeric,
    name: node?.name,
    createdAt: node?.createdAt,
    email: node?.email,
    total,
    tags: node?.tags || [],
    evidenceRef: mfs.evidence_ref || null,
    engineVersion: mfs.version || null,
    risk,
  });
}

function VerdictBadge({ verdict }) {
  if (verdict === "red") return <Badge3 tone="critical">High</Badge3>;
  if (verdict === "amber") return <Badge3 tone="warning">Medium</Badge3>;
  return <Badge3 tone="success">Low</Badge3>;
}

export default function EvidencePage() {
  const {
    shopDomain,
    id,
    name,
    createdAt,
    email,
    total,
    tags,
    evidenceRef,
    engineVersion,
    risk,
  } = useLoaderData3();

  return (
    <Page3 title={`Evidence – ${name || `Order ${id}`}`}>
      <Layout3>
        <Layout3.Section>
          <Card3>
            <Box3 padding="400">
              <InlineGrid3 columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                <BlockStack3 gap="150">
                  <Text3 as="span" tone="subdued">
                    Risk
                  </Text3>
                  <VerdictBadge verdict={risk.verdict} />
                </BlockStack3>
                <BlockStack3 gap="150">
                  <Text3 as="span" tone="subdued">
                    Score
                  </Text3>
                  <Text3 as="p" variant="headingLg">
                    {risk.score}
                  </Text3>
                </BlockStack3>
                <BlockStack3 gap="150">
                  <Text3 as="span" tone="subdued">
                    Evidence Ref
                  </Text3>
                  <Text3 as="p" variant="headingMd">
                    {evidenceRef || "—"}
                  </Text3>
                </BlockStack3>
                <BlockStack3 gap="150">
                  <Text3 as="span" tone="subdued">
                    Engine
                  </Text3>
                  <Text3 as="p" variant="headingMd">
                    {engineVersion || "—"}
                  </Text3>
                </BlockStack3>
              </InlineGrid3>
            </Box3>
          </Card3>
        </Layout3.Section>

        <Layout3.Section>
          <Card3>
            <Box3 padding="400">
              <InlineGrid3 columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
                <BlockStack3>
                  <Text3 as="span" tone="subdued">
                    Order
                  </Text3>
                  <Text3 as="p" variant="headingSm">
                    {name || `#${id}`}
                  </Text3>
                </BlockStack3>
                <BlockStack3>
                  <Text3 as="span" tone="subdued">
                    Created
                  </Text3>
                  <Text3 as="p">{new Date(createdAt).toLocaleString()}</Text3>
                </BlockStack3>
                <BlockStack3>
                  <Text3 as="span" tone="subdued">
                    Total
                  </Text3>
                  <Text3 as="p">{total}</Text3>
                </BlockStack3>
                <BlockStack3>
                  <Text3 as="span" tone="subdued">
                    Email
                  </Text3>
                  <Text3 as="p">{email || "—"}</Text3>
                </BlockStack3>
                <BlockStack3>
                  <Text3 as="span" tone="subdued">
                    Tags
                  </Text3>
                  <Text3 as="p">{(tags || []).join(", ") || "—"}</Text3>
                </BlockStack3>
                <BlockStack3>
                  <Text3 as="span" tone="subdued">
                    Open in Admin
                  </Text3>
                  <Button3
                    url={`https://${shopDomain}/admin/orders/${id}`}
                    external
                  >
                    Open
                  </Button3>
                </BlockStack3>
              </InlineGrid3>
            </Box3>
          </Card3>
        </Layout3.Section>

        <Layout3.Section>
          <Card3>
            <Box3 padding="400">
              <BlockStack3 gap="200">
                <Text3 as="h3" variant="headingMd">
                  Reasons
                </Text3>
                <Text3 as="p">
                  {(risk.reasons || []).join(" · ") || "No reasons provided"}
                </Text3>
              </BlockStack3>
            </Box3>
          </Card3>
        </Layout3.Section>

        <Layout3.Section>
          <Card3>
            <Box3 padding="400">
              <BlockStack3 gap="200">
                <Text3 as="h3" variant="headingMd">
                  Raw risk payload
                </Text3>
                <Box3
                  background="bg-surface-secondary"
                  padding="400"
                  borderWidth="025"
                  borderRadius="200"
                >
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {JSON.stringify(risk, null, 2)}
                  </pre>
                </Box3>
              </BlockStack3>
            </Box3>
          </Card3>
        </Layout3.Section>
      </Layout3>
    </Page3>
  );
}
