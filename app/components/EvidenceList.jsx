import { List, Text } from "@shopify/polaris";

export const EvidenceList = (reasons) => {
  if (!reasons || !reasons.length) {
    return <Text tone="subdued">No evidence recorded.</Text>;
  }
  return (
    <List type="bullet">
      {reasons.map((r, i) => (
        <List.Item key={i}>{r}</List.Item>
      ))}
    </List>
  );
};
