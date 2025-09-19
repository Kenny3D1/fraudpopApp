// app/routes/internal.metafields-set.jsx
import { json } from "@remix-run/node";
import shopify from "../shopify.server";

const INTERNAL_SHARED = process.env.INTERNAL_SHARED_SECRET;

const MUTATION = `#graphql
mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      key
      namespace
      type
      value
      owner { __typename ... on Order { id } }
    }
    userErrors { field message }
  }
}
`;

export async function action({ request }) {
  try {
    // auth gate
    if (
      !INTERNAL_SHARED ||
      request.headers.get("x-internal-auth") !== INTERNAL_SHARED
    ) {
      return json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // input
    const { shop, metafields } = await request.json();
    if (
      typeof shop !== "string" ||
      !Array.isArray(metafields) ||
      metafields.length === 0
    ) {
      return json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    // ✅ Correct for background jobs in Remix: get an unauthenticated Admin context
    const { admin } = await shopify.unauthenticated.admin(shop);

    // ✅ Call GraphQL via the admin context; this returns a Response
    const resp = await admin.graphql(MUTATION, { variables: { metafields } });
    const body = await resp.json();

    const result = body?.data?.metafieldsSet;
    const errors = body?.errors;
    const userErrors = result?.userErrors ?? [];

    if (errors?.length) {
      return json(
        { ok: false, error: "graphql_errors", errors },
        { status: 502 },
      );
    }
    if (userErrors.length) {
      return json(
        { ok: false, error: "user_errors", userErrors },
        { status: 422 },
      );
    }

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
