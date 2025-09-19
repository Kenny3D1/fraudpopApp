// app/routes/api.metafields-set.jsx
import { json } from "@remix-run/node";

const INTERNAL_SHARED = process.env.INTERNAL_SHARED_SECRET;

export async function loader() {
  // Never allow HTML rendering on this route
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
  return typeof s === "string" && /^[a-z0-9-]+\.myshopify\.com$/i.test(s);
}

export async function action({ request }) {
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

    // 🔑 Defer the import so if it throws we can catch and return JSON
    let shopify;
    try {
      ({ default: shopify } = await import("../shopify.server"));
    } catch (e) {
      console.error("Failed to import shopify.server:", e);
      return json(
        { ok: false, error: "server_import_failed", message: e?.message },
        { status: 500 },
      );
    }

    // Ensure offline session exists (avoid unauthenticated.admin crash)
    const offlineId = shopify.session.getOfflineId(shop);
    let offline;
    try {
      offline = await shopify.sessionStorage.loadSession(offlineId);
    } catch (e) {
      console.error("sessionStorage.loadSession failed:", e);
      return json(
        { ok: false, error: "session_storage_error", message: e?.message },
        { status: 500 },
      );
    }

    if (!offline) {
      return json({ ok: false, error: "no_offline_session" }, { status: 403 });
    }

    let admin;
    try {
      ({ admin } = await shopify.unauthenticated.admin(shop));
    } catch (e) {
      console.error("unauthenticated.admin failed:", e);
      return json(
        { ok: false, error: "admin_context_failed", message: e?.message },
        { status: 500 },
      );
    }

    let resp;
    try {
      resp = await admin.graphql(MUTATION, { variables: { metafields } });
    } catch (e) {
      console.error("admin.graphql transport error:", e);
      return json(
        { ok: false, error: "graphql_transport_error", message: e?.message },
        { status: 502 },
      );
    }

    const raw = await resp.text();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Non-JSON GraphQL response:", raw.slice(0, 1000));
      return json(
        {
          ok: false,
          error: "invalid_graphql_response",
          status: resp.status,
          text: raw.slice(0, 1000),
        },
        { status: 502 },
      );
    }

    if (parsed?.errors?.length) {
      return json(
        { ok: false, error: "graphql_errors", errors: parsed.errors },
        { status: 502 },
      );
    }

    const result = parsed?.data?.metafieldsSet;
    const userErrors = result?.userErrors || [];
    if (userErrors.length) {
      return json(
        { ok: false, error: "user_errors", userErrors },
        { status: 422 },
      );
    }

    return json({ ok: true, result }, { status: 200 });
  } catch (e) {
    console.error("api.metafields-set action unexpected error:", e);
    return json(
      { ok: false, error: "exception", message: e?.message },
      { status: 500 },
    );
  }
}

export default function ApiMetafieldsSet() {
  return null;
}
