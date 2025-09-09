import { useSubmit, useSearchParams } from "@remix-run/react";
import {
  Filters,
  TextField,
  ChoiceList,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";

export const OrderFilters = () => {
  const submit = useSubmit();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [risk, setRisk] = useState(
    params.get("risk") ? [params.get("risk")] : [],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      const fd = new FormData();
      if (query) fd.set("q", query);
      if (risk[0]) fd.set("risk", risk[0]);
      submit(fd, { method: "get" });
    }, 300);
    return () => clearTimeout(t);
  }, [query, risk, submit]);

  const onClearAll = useCallback(() => {
    setQuery("");
    setRisk([]);
    const fd = new FormData();
    submit(fd, { method: "get" });
  }, [submit]);

  const filters = [
    {
      key: "risk",
      label: "Risk",
      filter: (
        <ChoiceList
          title="Risk"
          titleHidden
          choices={[
            { label: "Low", value: "green" },
            { label: "Medium", value: "warn" },
            { label: "High", value: "red" },
          ]}
          selected={risk}
          onChange={(v) => setRisk(v)}
          allowMultiple={false}
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = risk.length
    ? [{ key: "risk", label: `Risk: ${risk[0]}` }]
    : [];

  return (
    <Filters
      queryValue={query}
      filters={filters}
      appliedFilters={appliedFilters}
      onQueryChange={setQuery}
      onQueryClear={() => setQuery("")}
      onClearAll={onClearAll}
    >
      <InlineStack gap="200">
        <Button onClick={onClearAll}>Clear</Button>
      </InlineStack>
    </Filters>
  );
};
