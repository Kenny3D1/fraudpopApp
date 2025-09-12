// Creates/ensures FraudPop ORDER metafield definitions using the modern "access" API.
// Requires app scopes: read_orders, write_orders

const DEFNS = [
  [
    "FraudPop Risk Score",
    "risk_score",
    "number_integer",
    "0–100 composite risk score",
  ],
  [
    "FraudPop Risk Verdict",
    "risk_verdict",
    "single_line_text_field",
    "Traffic-light verdict",
  ],
  [
    "FraudPop Reasons",
    "risk_reasons",
    "json",
    "Compact list of rule hits/signals",
  ],
  [
    "FraudPop Evidence Ref",
    "evidence_ref",
    "single_line_text_field",
    "Internal evidence log id",
  ],
  [
    "FraudPop Engine Version",
    "version",
    "single_line_text_field",
    "Scoring engine version",
  ],
  [
    "FraudPop Scored At",
    "scored_at",
    "date_time",
    "Timestamp when order was scored",
  ],
  [
    "FraudPop Device Seen Count",
    "device_seen_count",
    "number_integer",
    "Anonymized device count",
  ],
  [
    "FraudPop Vault Hits",
    "vault_hits",
    "number_integer",
    "Prior bad-flag count",
  ],
  [
    "FraudPop Feedback Label",
    "feedback_label",
    "single_line_text_field",
    "Merchant feedback: safe|caution",
  ],
  [
    "FraudPop Feedback Note",
    "feedback_note",
    "multi_line_text_field",
    "Optional merchant note",
  ],
  [
    "FraudPop Feedback Next Check",
    "feedback_next_check_at",
    "date_time",
    "When to re-prompt (15/30 days)",
  ],
];

const makeOp = (alias, [name, key, type, desc]) => `
  ${alias}: metafieldDefinitionCreate(definition: {
    name: ${JSON.stringify(name)}
    namespace: "$app:fraudpop"
    key: ${JSON.stringify(key)}
    type: ${JSON.stringify(type)}
    description: ${JSON.stringify(desc)}
    ownerType: ORDER
    access: { admin: MERCHANT_READ_WRITE, storefront: NONE, customerAccount: NONE }
  }) {
    createdDefinition { id namespace key access { admin storefront customerAccount } }
    userErrors { field message code }
  }
`;

export async function ensureFraudpopMetafields(admin) {
  const mutation = `mutation EnsureFraudpop {
    ${DEFNS.map((d, i) => makeOp(`op${i}`, d)).join("\n")}
  }`;

  const res = await admin.graphql(mutation);
  const json = await res.json();

  // Gather all userErrors so nothing is hidden
  const errs = [];
  for (const [alias, payload] of Object.entries(json?.data || {})) {
    (payload?.userErrors || []).forEach((e) => errs.push({ alias, ...e }));
  }

  // Ignore "already exists"/"TAKEN"; throw anything else
  const blocking = errs.filter(
    (e) => !/already.*exist/i.test(e.message || "") && e.code !== "TAKEN",
  );

  if (blocking.length) {
    throw new Error("Metafield definition errors: " + JSON.stringify(blocking));
  }

  return json;
}
