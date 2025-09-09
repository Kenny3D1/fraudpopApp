import { json } from "@remix-run/node";
import { useLoaderData, Link, useSearchParams } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  Badge,
  Pagination,
  InlineStack,
  BlockStack,
  IndexTable,
  useIndexResourceState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { ScoreLegend } from "../components/ScoreLegend";
import { OrderFilters } from "../components/OrderFilters";

const ORDERS_QUERY = `
  query Orders($first: Int!, $after: String) {
    orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        cursor
        node {
          id
          name
          email
          currentTotalPriceSet { presentmentMoney { amount currencyCode } }
          metafield(namespace: "fraudpop", key: "risk") { value }
        }
      }
    }
  }
`;

export async function loader({ request }) {
  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const risk = url.searchParams.get("risk");
  const first = 25;

  const { admin } = await authenticate.admin(request);
  const resp = await admin.graphql(ORDERS_QUERY, {
    variables: { first, after },
  });
  const body = await resp.json();

  const conn = body?.data?.orders;
  const edges = conn?.edges || [];

  const items = edges.map(({ node }) => {
    const total = node.currentTotalPriceSet.presentmentMoney;
    let riskObj = {};
    if (node.metafield?.value) {
      try {
        riskObj = JSON.parse(node.metafield.value);
      } catch {}
    }
    return {
      gid: node.id,
      name: node.name,
      email: node.email,
      total: `${total.amount} ${total.currencyCode}`,
      verdict: riskObj.verdict || "green",
      reasons: riskObj.reasons || [],
    };
  });

  const rows = risk ? items.filter((i) => i.verdict === risk) : items;

  return json({
    rows,
    pageInfo: conn?.pageInfo || { hasNextPage: false, endCursor: null },
  });
}

function RiskBadgeInline({ verdict }) {
  if (verdict === "red") return <Badge tone="critical">High</Badge>;
  if (verdict === "warn") return <Badge tone="warning">Medium</Badge>;
  return <Badge tone="success">Low</Badge>;
}

export default function AppIndex() {
  const { rows, pageInfo } = useLoaderData();
  const [params] = useSearchParams();

  // IndexTable selection helpers (not strictly needed, but good defaults)
  const resourceName = { singular: "order", plural: "orders" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(rows.map((r) => r.gid));

  const nextParams = new URLSearchParams(params);
  if (pageInfo?.endCursor) nextParams.set("after", pageInfo.endCursor);

  return (
    <Page title="FraudPop – Orders">
      <BlockStack gap="400">
        <Card>
          <InlineStack
            align="space-between"
            blockAlign="center"
            gap="200"
            wrap={false}
            style={{ padding: 16 }}
          >
            <Text as="h2" variant="headingMd">
              Orders
            </Text>
            <ScoreLegend />
          </InlineStack>

          <div style={{ padding: 12 }}>
            <OrderFilters />
          </div>

          <IndexTable
            resourceName={resourceName}
            itemCount={rows.length}
            selectedItemsCount={
              allResourcesSelected ? "ALL" : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: "Order" },
              { title: "Email" },
              { title: "Total" },
              { title: "Risk" },
              { title: "Evidence" },
            ]}
          >
            {rows.map((o, index) => (
              <IndexTable.Row
                id={o.gid}
                key={o.gid}
                selected={selectedResources.includes(o.gid)}
                position={index}
              >
                <IndexTable.Cell>
                  <Link
                    to={`/app/orders/${encodeURIComponent(o.gid)}`}
                    prefetch="intent"
                  >
                    {o.name}
                  </Link>
                </IndexTable.Cell>
                <IndexTable.Cell>{o.email || "—"}</IndexTable.Cell>
                <IndexTable.Cell>{o.total}</IndexTable.Cell>
                <IndexTable.Cell>
                  <RiskBadgeInline verdict={o.verdict} />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {(o.reasons || []).join("; ") || "—"}
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>

          <div style={{ padding: 12 }}>
            <Pagination
              hasPrevious={Boolean(params.get("after"))}
              onPrevious={() => {
                const sp = new URLSearchParams(params);
                sp.delete("after");
                window.location.search = sp.toString();
              }}
              hasNext={Boolean(pageInfo?.hasNextPage)}
              onNext={() => {
                const sp = new URLSearchParams(nextParams);
                window.location.search = sp.toString();
              }}
            />
          </div>
        </Card>
      </BlockStack>
    </Page>
  );
}
