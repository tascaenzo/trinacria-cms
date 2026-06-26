import { Card } from "@trinacria-cms/trinacria-ui";
import { JsonPreviewAction } from "../../components/json-preview-action.js";

export function DeclarativeManifestPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <Card eyebrow="Declarative" title={title}>
      <JsonPreviewAction title={title} payloadTitle={title} value={value} width="xl" />
    </Card>
  );
}
