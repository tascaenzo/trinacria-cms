import { Card } from "@trinacria-cms/trinacria-ui";
import type { ReactNode } from "react";
import type { AdminPageRenderContext } from "../../runtime/admin-route-runtime.js";
import { useDeclarativeData } from "../hooks/use-declarative-data.js";
import { DeclarativeDataBinding } from "./declarative-data-binding.js";
import { DeclarativeManifestPanel } from "./declarative-manifest-panel.js";
import { DeclarativeResourcePage } from "./declarative-resource-page.js";

export function renderDeclarativeAdminPage(context: AdminPageRenderContext): ReactNode {
  return <DeclarativeAdminPage context={context} />;
}

export function DeclarativeAdminPage({ context }: { context: AdminPageRenderContext }) {
  const resource = context.resources.find((entry) => entry.routeId === context.route.id);
  const dataState = useDeclarativeData(context.route.data);

  if (context.route.kind === "resource" || resource) {
    return <DeclarativeResourcePage context={context} dataState={dataState} resource={resource} />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card eyebrow={context.route.pluginId} title={context.route.title}>
        <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-ink-muted)]">
          {context.route.summary ?? "Declarative admin page rendered from plugin manifest metadata."}
        </p>
        {context.route.data ? (
          <div className="mt-6">
            <DeclarativeDataBinding binding={context.route.data} dataState={dataState} />
          </div>
        ) : null}
      </Card>
      <DeclarativeManifestPanel
        title="Page manifest"
        value={{
          id: context.route.id,
          kind: context.route.kind,
          mode: context.route.mode,
          path: context.route.path,
          pluginId: context.route.pluginId
        }}
      />
    </div>
  );
}
