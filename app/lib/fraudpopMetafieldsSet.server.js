// app/lib/fraudpopMetafieldsSet.server.js
// Use after you score an order (in your webhook handler or job)

const METAFIELDS_SET = `
mutation metafieldsSet($ownerId: ID!, $metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(ownerId: $ownerId, metafields: $metafields) {
    metafields { key namespace id }
    userErrors { field message code }
  }
}
`;

// orderId: a GID like "gid://shopify/Order/1234567890"
export async function setFraudpopOrderMetafields(
  admin,
  orderId,
  {
    score,
    verdict,
    reasons,
    evidenceRef,
    version,
    scoredAt,
    deviceSeenCount,
    vaultHits,
    feedbackLabel,
    feedbackNote,
    feedbackNextCheckAt,
  },
) {
  const mf = [];

  const push = (key, type, value) => {
    if (value === undefined || value === null) return;
    mf.push({
      namespace: "fraudpop",
      key,
      type, // Must match definition type
      value: typeof value === "string" ? value : JSON.stringify(value),
    });
  };

  // Match types defined above
  push("risk_score", "number_integer", String(score ?? ""));
  push("risk_verdict", "single_line_text_field", verdict ?? "");
  if (reasons)
    mf.push({
      namespace: "fraudpop",
      key: "risk_reasons",
      type: "json",
      value: JSON.stringify(reasons),
    });
  push("evidence_ref", "single_line_text_field", evidenceRef ?? "");
  push("version", "single_line_text_field", version ?? "");
  push("scored_at", "date_time", scoredAt ?? new Date().toISOString());
  if (deviceSeenCount != null)
    push("device_seen_count", "number_integer", String(deviceSeenCount));
  if (vaultHits != null)
    push("vault_hits", "number_integer", String(vaultHits));
  if (feedbackLabel)
    push("feedback_label", "single_line_text_field", feedbackLabel);
  if (feedbackNote)
    push("feedback_note", "multi_line_text_field", feedbackNote);
  if (feedbackNextCheckAt)
    push("feedback_next_check_at", "date_time", feedbackNextCheckAt);

  if (!mf.length) return { ok: true, noop: true };

  const res = await admin.graphql(METAFIELDS_SET, {
    variables: { ownerId: orderId, metafields: mf },
  });
  const data = await res.json();
  const errs = data?.data?.metafieldsSet?.userErrors || [];
  if (errs.length) {
    console.warn("FraudPop metafieldsSet errors:", errs);
    return { ok: false, errors: errs };
  }
  return { ok: true };
}
