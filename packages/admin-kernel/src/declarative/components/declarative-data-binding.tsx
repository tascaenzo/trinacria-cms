import { InfoCard, KeyValueItem, KeyValuePanel } from "@trinacria-cms/trinacria-ui";
import { JsonPreviewAction } from "../../components/json-preview-action.js";
import type { AdminJsonDataBinding } from "../../contracts.js";
import type { DeclarativeDataState } from "../types.js";
import { formatEndpoint } from "../utils/formatting.js";

export function DeclarativeDataBinding({
  binding,
  dataState
}: {
  binding: AdminJsonDataBinding;
  dataState?: DeclarativeDataState;
}) {
  return (
    <div className="grid gap-4">
      <KeyValuePanel>
        {binding.endpoint ? (
          <KeyValueItem label="Endpoint" value={formatEndpoint(binding.endpoint)} />
        ) : null}
        {binding.valuePath ? <KeyValueItem label="Value path" value={binding.valuePath} /> : null}
        {dataState ? <KeyValueItem label="Data state" value={dataState.status} /> : null}
      </KeyValuePanel>
      {dataState?.status === "error" ? (
        <InfoCard title="Endpoint error" description={dataState.error} tone="dashed" />
      ) : null}
      {dataState?.status === "success" ? (
        <JsonPreviewAction
          title="Endpoint response"
          payloadTitle="Endpoint response"
          value={dataState.data}
        />
      ) : null}
      {binding.schema ? (
        <JsonPreviewAction title="Schema" payloadTitle="Schema" value={binding.schema} />
      ) : null}
    </div>
  );
}
