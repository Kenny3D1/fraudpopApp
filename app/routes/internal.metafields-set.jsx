// app/routes/internal.metafields-set.jsx
import { json } from "@remix-run/node";
import shopify from "../shopify.server";

const INTERNAL_SHARED = process.env.INTERNAL_SHARED_SECRET;

const MUTATION = `
mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id key namespace type value owner { __typename ... on Order { id } } }
    userErrors { field message }
  }
}
`;

export async function action({ request }) {
  try {
    if (
      !INTERNAL_SHARED ||
      request.headers.get("x-internal-auth") !== INTERNAL_SHARED
    ) {
      return json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { shop, metafields } = await request.json();
    if (!shop || !Array.isArray(metafields) || metafields.length === 0) {
      return json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const offlineId = shopify.session.getOfflineId(shop);
    const session = await shopify.sessionStorage.loadSession(offlineId);
    if (!session) {
      return json({ ok: false, error: "no_offline_session" }, { status: 403 });
    }

    // ✅ Correct way to make a GraphQL client
    const client = new shopify.api.clients.Graphql({ session });

    const resp = await client.request(MUTATION, { variables: { metafields } });
    const result = resp?.data?.metafieldsSet;
    const errors = resp?.errors;
    const userErrors = result?.userErrors || [];

    if (errors?.length)
      return json(
        { ok: false, error: "graphql_errors", errors },
        { status: 502 },
      );
    if (userErrors.length)
      return json(
        { ok: false, error: "user_errors", userErrors },
        { status: 422 },
      );

    return json({ ok: true, result }, { status: 200 });
  } catch (e) {
    return json(
      { ok: false, error: "exception", message: e?.message },
      { status: 500 },
    );
  }
}

export default function InternalMetafieldsSet() {
  return null;
}
