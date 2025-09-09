import { Badge } from "@shopify/polaris";

export const RiskBadge = (verdict) => {
  if (verdict === "red") return <Badge tone="critical">High</Badge>;
  if (verdict === "warn") return <Badge tone="warning">Medium</Badge>;
  return <Badge tone="success">Low</Badge>;
};
