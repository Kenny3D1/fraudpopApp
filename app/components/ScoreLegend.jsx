import { Tooltip, InlineStack, Badge, Text } from "@shopify/polaris";

export const ScoreLegend = () => {
  return (
    <InlineStack gap="200" align="start" blockAlign="center" wrap>
      <Text as="span" tone="subdued">
        Legend:
      </Text>
      <Tooltip content="Likely safe, minimal risk signals">
        <Badge tone="success">Low</Badge>
      </Tooltip>
      <Tooltip content="Some indicators; review before fulfilling">
        <Badge tone="warning">Medium</Badge>
      </Tooltip>
      <Tooltip content="Strong indicators; manual verification">
        <Badge tone="critical">High</Badge>
      </Tooltip>
    </InlineStack>
  );
};
