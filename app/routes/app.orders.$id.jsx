import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { RiskBadge } from "../components/RiskBadge";
import { EvidenceList } from "../components/EvidenceList";

const ORDER_QUERY = `
  query Order($id: ID!) {
    order(id: $id) {
      id
      name
      email
      createdAt
      currentTotalPriceSet { presentmentMoney { amount currencyCode } }
      shippingAddress { city country code province zip }
      metafield(namespace: "fraudpop", key: "risk") { value }
    }
  }
`;

export async function loader({ request, params }) {
  const gid = decodeURIComponent(params.id);
  const { admin } = await authenticate.admin(request);
  const r = await admin.graphql(ORDER_QUERY, { variables: { id: gid } });
  const data = await r.json();
  const n = data?.data?.order;
  if (!n) throw new Response("Order not found", { status: 404 });

  let risk = { verdict: "green", reasons: [] };
  if (n.metafield?.value) {
    try {
      risk = JSON.parse(n.metafield.value);
    } catch {}
  }
  const total = n.currentTotalPriceSet.presentmentMoney;

  return json({
    name: n.name,
    email: n.email,
    createdAt: n.createdAt,
    total: `${total.amount} ${total.currencyCode}`,
    shipping: n.shippingAddress,
    risk,
  });
}

export default function OrderDetails() {
  const { name, email, createdAt, total, shipping, risk } = useLoaderData();
  return (
    <Page title={name}>
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="200" padding="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingLg">
                {name}
              </Text>
              <RiskBadge verdict={risk.verdict} />
            </InlineStack>
            <InlineStack gap="400">
              <Badge>Placed</Badge>
              <Text tone="subdued">{new Date(createdAt).toLocaleString()}</Text>
            </InlineStack>
            <Divider />
            <InlineStack gap="400">
              <Text>Email:</Text>
              <Text tone="subdued">{email || "—"}</Text>
            </InlineStack>
            <InlineStack gap="400">
              <Text>Total:</Text>
              <Text tone="subdued">{total}</Text>
            </InlineStack>
            {shipping && (
              <InlineStack gap="400">
                <Text>Ship to:</Text>
                <Text tone="subdued">
                  {shipping.city}, {shipping.province} {shipping.zip},{" "}
                  {shipping.country}
                </Text>
              </InlineStack>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300" padding="400">
            <Text as="h3" variant="headingMd">
              Evidence
            </Text>
            <EvidenceList reasons={risk.reasons || []} />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
