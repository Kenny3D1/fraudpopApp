import { json } from "@remix-run/node";
import shopify from "../shopify.server";

const INTERNAL_SHARED = process.env.INTERNAL_SHARED_SECRET;

export async function loader() {
  return json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}

const MUTATION = `#graphql
mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id key namespace type value
      owner { __typename ... on Order { id } }
    }
    userErrors { field message }
  }
}
`;

function isShop(s) {
  return !!s && /^[a-z0-9-]+\.myshopify\.com$/i.test(s);
}

export async function action(request) {
  try {
    if (
      !INTERNAL_SHARED ||
      request.headers.get("x-internal-auth") !== INTERNAL_SHARED
    ) {
      return json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "bad_json" }, { status: 400 });
    }

    const shop = (body?.shop || "").toLowerCase();
    const metafields = body?.metafields;
    if (
      !isShop(shop) ||
      !Array.isArray(metafields) ||
      metafields.length === 0
    ) {
      return json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    // Ensure offline session exists (so we can return a clear 403)
    const offlineId = shopify.session.getOfflineId(shop);
    const offline = await shopify.sessionStorage.loadSession(offlineId);
    if (!offline) {
      return json({ ok: false, error: "no_offline_session" }, { status: 403 });
    }

    const { admin } = await shopify.unauthenticated.admin(shop);
    const resp = await admin.graphql(MUTATION, { variables: { metafields } });

    const text = await resp.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json(
        {
          ok: false,
          error: "invalid_graphql_response",
          status: resp.status,
          text: text.slice(0, 1000),
        },
        { status: 502 },
      );
    }

    const errors = parsed?.errors;
    const result = parsed?.data?.metafieldsSet;
    const userErrors = result?.userErrors ?? [];

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

export default function ApiMetafieldsSet() {
  return null;
}
