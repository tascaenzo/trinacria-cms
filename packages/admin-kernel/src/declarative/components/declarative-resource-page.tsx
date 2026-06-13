import { Card, InfoCard, ResourcePage } from "@trinacria-cms/trinacria-ui";
import type { AdminResourceDefinition } from "../../contracts.js";
import type { AdminPageRenderContext } from "../../runtime/admin-route-runtime.js";
import type { DeclarativeDataController } from "../types.js";
import { useDeclarativeActionController } from "../hooks/use-declarative-action-controller.js";
import { DeclarativeActionsPanel } from "./declarative-actions-panel.js";
import { DeclarativeDataBinding } from "./declarative-data-binding.js";
import { DeclarativeManifestPanel } from "./declarative-manifest-panel.js";
import { DeclarativeResourceTable } from "./declarative-resource-table.js";

export function DeclarativeResourcePage({
  context,
  dataState,
  resource
}: {
  context: AdminPageRenderContext;
  dataState: DeclarativeDataController;
  resource?: AdminResourceDefinition;
}) {
  const title = resource?.title ?? context.route.title;
  const summary = resource?.summary ?? context.route.summary;
  const actionController = useDeclarativeActionController({
    onSuccess: dataState.refetch
  });

  return (
    <ResourcePage
      header={
        <Card eyebrow={resource?.pluginId ?? context.route.pluginId} title={title}>
          <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-ink-muted)]">
            {summary ?? "Resource surface generated from the admin manifest."}
          </p>
        </Card>
      }
      sidebar={
        <div className="grid gap-4">
          <DeclarativeManifestPanel
            title="Resource contract"
            value={{
              id: resource?.id,
              entityName: resource?.entityName,
              routeId: resource?.routeId,
              capabilities: resource?.capabilities,
              actions: resource?.actions?.map((action) => action.id)
            }}
          />
          {resource?.actions?.length ? (
            <DeclarativeActionsPanel
              actions={resource.actions}
              onPrepare={actionController.prepareAction}
              title="Resource actions"
            />
          ) : null}
          {context.route.data ? (
            <DeclarativeDataBinding binding={context.route.data} dataState={dataState} />
          ) : null}
        </div>
      }
    >
      {resource ? (
        <DeclarativeResourceTable
          binding={context.route.data}
          dataState={dataState}
          onPrepareAction={actionController.prepareAction}
          resource={resource}
        />
      ) : (
        <InfoCard
          eyebrow={context.route.pluginId}
          title="Missing resource descriptor"
          description="This declarative route is marked as a resource page, but no resource definition is linked to the route id."
          tone="dashed"
        />
      )}
      {actionController.dialog}
    </ResourcePage>
  );
}
