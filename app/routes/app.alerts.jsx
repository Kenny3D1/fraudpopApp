// ==============================
// app/routes/app.alerts.jsx
// ==============================
import { json as json2 } from "@remix-run/node";
import {
  useLoaderData as useLoaderData2,
  useSearchParams,
} from "@remix-run/react";
import {
  Page as Page2,
  Layout as Layout2,
  Card as Card2,
  BlockStack as BlockStack2,
  InlineGrid as InlineGrid2,
  Text as Text2,
  Button as Button2,
  IndexTable as IndexTable2,
  useIndexResourceState as useIndexResourceState2,
  Link as Link2,
  Badge as Badge2,
  Box as Box2,
} from "@shopify/polaris";
import { authenticate as authenticate2 } from "../shopify.server";

const ORDERS_QUERY = `#graphql
  query OrdersForAlerts($first: Int!, $queryStr: String) {
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
  }
`;

export async function loader({ request }) {
  const { admin, session } = await authenticate2.admin(request);
  const shopDomain = session.shop;

  const url = new URL(request.url);
  const days = Math.max(1, Number(url.searchParams.get("days") || 14));
  const verdict = url.searchParams.get("verdict") || "all"; // all | red | amber | green

  const since = new Date();
  since.setDate(since.getDate() - days);
  const yyyy = since.getUTCFullYear();
  const mm = String(since.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(since.getUTCDate()).padStart(2, "0");
  const queryStr = `created_at:>=${yyyy}-${mm}-${dd}`;

  const resp = await admin.graphql(ORDERS_QUERY, {
    variables: { first: 100, queryStr },
  });
  const body = await resp.json();
  const orders = (body?.data?.orders?.edges || []).map(({ node }) => {
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
      } catch {}
    }
    return {
      gid: node.id,
      id: node.id.split("/").pop(),
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

  const filtered =
    verdict === "all" ? orders : orders.filter((o) => o.verdict === verdict);
  const sorted = filtered.sort((a, b) => b.score - a.score);

  return json2({ shopDomain, days, verdict, alerts: sorted });
}

function RiskBadge2({ verdict }) {
  if (verdict === "red") return <Badge2 tone="critical">High</Badge2>;
  if (verdict === "amber") return <Badge2 tone="warning">Medium</Badge2>;
  return <Badge2 tone="success">Low</Badge2>;
}

export default function AlertsPage() {
  const { shopDomain, days, verdict, alerts } = useLoaderData2();
  const ids = alerts.map((a) => a.gid);
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState2(ids);

  const setQuery = (next) => {
    const usp = new URLSearchParams(window.location.search);
    Object.entries(next).forEach(([k, v]) => {
      if (v === null) usp.delete(k);
      else usp.set(k, String(v));
    });
    window.location.search = usp.toString();
  };

  return (
    <Page2 title="Alerts" subtitle="Sorted by highest risk score">
      <Layout2>
        <Layout2.Section>
          <Card2>
            <Box2 padding="400">
              <InlineGrid2 columns={{ xs: 1, sm: 2, md: 3 }} gap="300">
                <BlockStack2 gap="100">
                  <Text2 as="h3" variant="headingSm">
                    Time window
                  </Text2>
                  <InlineGrid2 columns={3} gap="200">
                    <Button2
                      pressed={days === 7}
                      onClick={() => setQuery({ days: 7 })}
                    >
                      7d
                    </Button2>
                    <Button2
                      pressed={days === 14}
                      onClick={() => setQuery({ days: 14 })}
                    >
                      14d
                    </Button2>
                    <Button2
                      pressed={days === 30}
                      onClick={() => setQuery({ days: 30 })}
                    >
                      30d
                    </Button2>
                  </InlineGrid2>
                </BlockStack2>
                <BlockStack2 gap="100">
                  <Text2 as="h3" variant="headingSm">
                    Risk filter
                  </Text2>
                  <InlineGrid2 columns={4} gap="200">
                    <Button2
                      pressed={verdict === "all"}
                      onClick={() => setQuery({ verdict: "all" })}
                    >
                      All
                    </Button2>
                    <Button2
                      pressed={verdict === "red"}
                      onClick={() => setQuery({ verdict: "red" })}
                    >
                      High
                    </Button2>
                    <Button2
                      pressed={verdict === "amber"}
                      onClick={() => setQuery({ verdict: "amber" })}
                    >
                      Medium
                    </Button2>
                    <Button2
                      pressed={verdict === "green"}
                      onClick={() => setQuery({ verdict: "green" })}
                    >
                      Low
                    </Button2>
                  </InlineGrid2>
                </BlockStack2>
              </InlineGrid2>
            </Box2>
          </Card2>
        </Layout2.Section>

        <Layout2.Section>
          <Card2>
            <IndexTable2
              resourceName={{ singular: "alert", plural: "alerts" }}
              itemCount={alerts.length}
              selectedItemsCount={
                allResourcesSelected ? "ALL" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Order" },
                { title: "Email" },
                { title: "Created" },
                { title: "Total" },
                { title: "Risk" },
                { title: "Reasons" },
                { title: "" },
              ]}
            >
              {alerts.map((o, index) => (
                <IndexTable2.Row
                  key={o.gid}
                  id={o.gid}
                  position={index}
                  selected={selectedResources.includes(o.gid)}
                >
                  <IndexTable2.Cell>
                    <Link2
                      url={`https://${shopDomain}/admin/orders/${o.id}`}
                      external
                    >
                      {o.name}
                    </Link2>
                  </IndexTable2.Cell>
                  <IndexTable2.Cell>{o.email || "—"}</IndexTable2.Cell>
                  <IndexTable2.Cell>
                    {new Date(o.createdAt).toLocaleString()}
                  </IndexTable2.Cell>
                  <IndexTable2.Cell>{o.total}</IndexTable2.Cell>
                  <IndexTable2.Cell>
                    <RiskBadge2 verdict={o.verdict} />
                  </IndexTable2.Cell>
                  <IndexTable2.Cell>
                    {(o.reasons || []).slice(0, 4).join(" · ") ||
                      "No flags recorded"}
                    {o.reasons?.length > 4 ? " …" : ""}
                  </IndexTable2.Cell>
                  <IndexTable2.Cell>
                    <InlineGrid2 columns={2} gap="200">
                      <Button2 url={`/app/evidence/${o.id}`}>Evidence</Button2>
                      <Button2
                        url={`https://${shopDomain}/admin/orders/${o.id}`}
                        external
                      >
                        Open
                      </Button2>
                    </InlineGrid2>
                  </IndexTable2.Cell>
                </IndexTable2.Row>
              ))}
            </IndexTable2>
          </Card2>
        </Layout2.Section>
      </Layout2>
    </Page2>
  );
}
