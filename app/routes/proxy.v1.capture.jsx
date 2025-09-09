import { json } from "@remix-run/node";
import crypto from "crypto";

function verifyProxySignature(url, secret) {
  const u = new URL(url);
  const signature = u.searchParams.get("signature");
  if (!signature) return false;
  const params = [];
  u.searchParams.forEach((v, k) => {
    if (k !== "signature") params.push([k, v]);
  });
  params.sort((a, b) => a[0].localeCompare(b[0]));
  const base = params.map(([k, v]) => `${k}=${v}`).join("&");
  const h = crypto.createHmac("sha256", secret).update(base).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(signature));
}

export async function action({ request }) {
  const secret = process.env.SHOPIFY_API_SECRET;
  const ok = verifyProxySignature(request.url, secret);
  const body = await request.json().catch(() => ({}));
  return json({
    ok,
    shop: new URL(request.url).searchParams.get("shop"),
    body,
  });
}

// Allow POSTs from the storefront proxy
export const loader = () => new Response("FraudPop proxy is alive.");
