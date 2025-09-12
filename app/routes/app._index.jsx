// app/routes/app._index.jsx
import { json } from "@remix-run/node";
import { useLoaderData, Link as RemixLink } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  Badge,
  Button,
  Banner,
  IndexTable,
  useIndexResourceState,
  Link,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

const DASHBOARD_QUERY = `
  query Dashboard($first: Int!, $queryStr: String) {
    orders(first: $first, sortKey: CREATED_AT, reverse: true, query: $queryStr) {
      edges {
        node {
          id
          name
          email
          createdAt
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          metafield(namespace: "fraudpop", key: "risk") { value }
          tags
        }
      }
    }
    metafieldDefinitions(first: 20, ownerType: ORDER, namespace: "fraudpop") {
      edges { node { id key namespace } }
    }
  }
`;

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // last 14 days
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const yyyy = since.getUTCFullYear();
  const mm = String(since.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(since.getUTCDate()).padStart(2, "0");
  const queryStr = `created_at:>=${yyyy}-${mm}-${dd}`;

  const resp = await admin.graphql(DASHBOARD_QUERY, {
    variables: { first: 50, queryStr },
  });
  const body = await resp.json();

  const defs =
    body?.data?.metafieldDefinitions?.edges?.map((e) => e.node) || [];
  const hasRiskDefinition = !!defs.find(
    (d) => d.key === "risk" && d.namespace === "fraudpop",
  );

  const edges = body?.data?.orders?.edges || [];
  const orders = edges.map(({ node }) => {
    const money = node.currentTotalPriceSet?.shopMoney;
    let risk = { verdict: "green", reasons: [], score: 0 };
    if (node.metafield?.value) {
      try {
        const parsed = JSON.parse(node.metafield.value);
        risk = {
          verdict: parsed.verdict || "green",
          reasons: parsed.reasons || [],
          score: parsed.score || 0,
        };
      } catch {
        /* ignore bad JSON */
      }
    }
    return {
      gid: node.id,
      id: node.id.split("/").pop(), // numeric id for deep links
      name: node.name,
      email: node.email,
      createdAt: node.createdAt,
      total: money
        ? `${Number(money.amount).toFixed(2)} ${money.currencyCode}`
        : "—",
      verdict: risk.verdict,
      reasons: risk.reasons,
      score: risk.score,
      tags: node.tags || [],
    };
  });

  // KPIs
  const kpis = orders.reduce(
    (acc, o) => {
      acc.total += 1;
      if (o.verdict === "red") acc.red += 1;
      else if (o.verdict === "amber") acc.amber += 1;
      else acc.green += 1;
      return acc;
    },
    { total: 0, red: 0, amber: 0, green: 0 },
  );

  // recent alerts (top risky)
  const recentAlerts = orders
    .filter((o) => o.verdict !== "green")
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return json({
    shopDomain,
    hasRiskDefinition,
    kpis,
    recentAlerts,
  });
}

function RiskBadge({ verdict }) {
  if (verdict === "red") return <Badge tone="critical">High</Badge>;
  if (verdict === "amber") return <Badge tone="warning">Medium</Badge>;
  return <Badge tone="success">Low</Badge>;
}

function KpiCard({ label, value, tone }) {
  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="200">
          <Text as="h3" variant="headingSm" tone="subdued">
            {label}
          </Text>
          <Text as="p" variant="heading2xl" tone={tone || undefined}>
            {value}
          </Text>
        </BlockStack>
      </Box>
    </Card>
  );
}

export default function AppIndex() {
  const { shopDomain, hasRiskDefinition, kpis, recentAlerts } = useLoaderData();

  const resourceName = { singular: "order", plural: "orders" };
  const ids = recentAlerts.map((r) => r.gid);
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(ids);

  const linkToTag = (label) =>
    `https://${shopDomain}/admin/orders?query=${encodeURIComponent(
      `tag:${label}`,
    )}`;

  const redTag = "FraudPop: Red";
  const amberTag = "FraudPop: Amber";
  const greenTag = "FraudPop: Green";

  return (
    <Page
      title="FraudPop Dashboard"
      subtitle="Fast risk visibility at a glance"
    >
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <KpiCard label="Orders (14d)" value={kpis.total} />
            <KpiCard label="High risk" value={kpis.red} tone="critical" />
            <KpiCard label="Medium risk" value={kpis.amber} tone="warning" />
            <KpiCard label="Low risk" value={kpis.green} tone="success" />
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box paddingInline="400" paddingBlockStart="400">
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Recent alerts
                </Text>
                <Text tone="subdued">
                  Highest-risk orders from the last 14 days.
                </Text>
              </BlockStack>
            </Box>

            <IndexTable
              resourceName={resourceName}
              itemCount={recentAlerts.length}
              selectedItemsCount={
                allResourcesSelected ? "ALL" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Order" },
                { title: "Email" },
                { title: "Total" },
                { title: "Risk" },
                { title: "Reasons" },
                { title: "" },
              ]}
            >
              {recentAlerts.map((o, index) => (
                <IndexTable.Row
                  id={o.gid}
                  key={o.gid}
                  position={index}
                  selected={selectedResources.includes(o.gid)}
                >
                  <IndexTable.Cell>
                    {/* Deep link to native Shopify Order page */}
                    <Link
                      url={`https://${shopDomain}/admin/orders/${o.id}`}
                      external
                    >
                      {o.name}
                    </Link>
                  </IndexTable.Cell>
                  <IndexTable.Cell>{o.email || "—"}</IndexTable.Cell>
                  <IndexTable.Cell>{o.total}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <RiskBadge verdict={o.verdict} />
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {(o.reasons || []).slice(0, 3).join(" · ") ||
                      "No flags recorded"}
                    {o.reasons?.length > 3 ? " …" : ""}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Button
                      url={`https://${shopDomain}/admin/orders/${o.id}`}
                      external
                      size="slim"
                    >
                      Open
                    </Button>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Quick actions
                </Text>
                <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="300">
                  <Button
                    url="/app/settings"
                    // stay inside app for settings
                  >
                    Open Settings
                  </Button>
                  <Button url={linkToTag(redTag)} external>
                    View High risk (tag)
                  </Button>
                  <Button url={linkToTag(amberTag)} external>
                    View Medium risk (tag)
                  </Button>
                  <Button url={linkToTag(greenTag)} external>
                    View Low risk (tag)
                  </Button>
                  <Button
                    url={`https://${shopDomain}/admin/settings/apps`}
                    external
                  >
                    Manage app permissions
                  </Button>
                  <Button url={`https://${shopDomain}/admin/themes`} external>
                    Verify theme extension load
                  </Button>
                </InlineGrid>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
