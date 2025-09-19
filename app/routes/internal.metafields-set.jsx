// app/routes/internal.metafields-set.jsx
import { json } from "@remix-run/node";
import { shopify } from "../shopify.server";

export const loader = () => new Response("Method Not Allowed", { status: 405 });

export const action = async ({ request }) => {
  if (
    request.headers.get("x-internal-auth") !==
    process.env.INTERNAL_SHARED_SECRET
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const { shop, metafields } = await request.json();
  if (!shop || !Array.isArray(metafields)) {
    return new Response("Bad Request", { status: 400 });
  }

  // Load OFFLINE session and create Admin client
  const offlineId = shopify.api.session.getOfflineId(shop);
  const session = await shopify.sessionStorage.loadSession(offlineId);
  if (!session) return new Response("Shop not installed", { status: 404 });

  const admin = new shopify.api.clients.Graphql({ session });

  const mutation = `#graphql
    mutation SetRisk($metafields:[MetafieldsSetInput!]!) {
      metafieldsSet(metafields:$metafields) {
        metafields { id key namespace }
        userErrors { field message code }
      }
    }
  `;

  const resp = await admin.request(mutation, { metafields });
  const errors = resp?.data?.metafieldsSet?.userErrors || [];

  if (errors.length) {
    return json({ ok: false, errors }, { status: 400 });
  }
  return json({ ok: true });
};
