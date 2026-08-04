import { Card, CardContent, CardHeader, CardHeading, useToast } from "@trinacria-cms/trinacria-ui";
import { useCallback, useEffect, useState } from "react";
import { DeclarativeDashboardWidgetPanel } from "../declarative/index.js";
import { toDisplayError } from "../lib/sdk-errors.js";
import type {
  AdminDashboardWidgetRenderContext,
  AdminPageRenderContext,
  RenderableAdminDashboardWidget
} from "../runtime/admin-route-runtime.js";
import { AccessManagementDashboardWidget } from "./access-management-dashboard-widget.js";
import { DashboardWidgetBoard } from "./dashboard-widget-board.js";
import {
  type DashboardWidgetLayoutState,
  GLOBAL_DASHBOARD_WIDGET_LAYOUT_SETTING_KEY
} from "./dashboard-widget-board.storage.js";
export interface DashboardPageProps {
  pluginCount: number;
  capabilityCount: number;
  canCustomizeDashboard?: boolean;
  systemStateLabel: string;
  widgetContext?: Omit<AdminDashboardWidgetRenderContext, "widget">;
  widgets?: readonly RenderableAdminDashboardWidget[];
}

/**
 * DashboardPage is intentionally a blank widget canvas owned by plugin contributions.
 */
export function DashboardPage({
  canCustomizeDashboard = false,
  widgetContext,
  widgets = []
}: DashboardPageProps) {
  const {
    isLoading: isLayoutLoading,
    isSaving,
    layoutValue,
    layoutVersion,
    saveError,
    saveLayout
  } = useGlobalDashboardLayout(widgetContext?.cms);

  return (
    <DashboardWidgetBoard
      canCustomize={canCustomizeDashboard}
      heading="Panoramica"
      isLayoutLoading={isLayoutLoading}
      isSaving={isSaving}
      layoutValue={layoutValue}
      layoutVersion={layoutVersion}
      onSaveLayout={saveLayout}
      saveError={saveError}
      items={widgets.map((widget) => ({
        key: `${widget.pluginId}:${widget.id}`,
        pluginId: widget.pluginId,
        title: widget.title,
        layout: widget.layout,
        content: <DashboardWidgetSlot widget={widget} context={widgetContext} />
      }))}
    />
  );
}

function DashboardWidgetSlot({
  context,
  widget
}: {
  context?: Omit<AdminDashboardWidgetRenderContext, "widget">;
  widget: RenderableAdminDashboardWidget;
}) {
  if (widget.render && context) {
    return <>{widget.render({ ...context, widget })}</>;
  }

  if (widget.componentRef === "core-pack:access-management-widget" && context) {
    return <AccessManagementDashboardWidget context={context} />;
  }

  if (widget.kind === "card") {
    return <FallbackDashboardWidget widget={widget} />;
  }

  if (widget.mode === "declarative" || widget.kind) {
    return <DeclarativeDashboardWidgetPanel widget={widget} />;
  }

  return (
    <Card className="h-full" padding="none" elevation="none">
      <CardHeader>
        <CardHeading icon="puzzle" title={widget.title} description={widget.summary} />
      </CardHeader>
      {!widget.summary ? (
        <CardContent>
          <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
            Il plugin non ha configurato contenuti per questo widget.
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function FallbackDashboardWidget({ widget }: { widget: RenderableAdminDashboardWidget }) {
  return (
    <Card className="h-full" padding="none" elevation="none">
      <CardHeader>
        <CardHeading icon="layout-dashboard" title={widget.title} description={widget.summary} />
      </CardHeader>
      {!widget.summary ? (
        <CardContent>
          <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
            Nessun riepilogo disponibile.
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function createDashboardRender(props: DashboardPageProps) {
  return (context: AdminPageRenderContext) => (
    <DashboardPage
      {...props}
      widgetContext={{
        runtimePlugins: context.runtimePlugins,
        capabilityIndex: context.capabilityIndex,
        routes: context.routes,
        resources: context.resources,
        settings: context.settings,
        widgets: context.widgets,
        locale: context.locale,
        cms: context.cms,
        t: context.t,
        navigateToRoute: context.navigateToRoute
      }}
      widgets={context.widgets}
      canCustomizeDashboard={context.canCustomizeDashboard}
    />
  );
}

function useGlobalDashboardLayout(cms: AdminPageRenderContext["cms"] | undefined) {
  const [layoutValue, setLayoutValue] = useState<unknown>(undefined);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(cms));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { pushToast } = useToast();

  useEffect(() => {
    let isCancelled = false;

    async function loadLayout() {
      if (!cms) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setSaveError(null);
        const response = await cms.settings.getSettingValueByKey({
          path: { key: GLOBAL_DASHBOARD_WIDGET_LAYOUT_SETTING_KEY }
        });
        if (isCancelled) return;
        setLayoutValue(response.data?.value);
        setLayoutVersion((current) => current + 1);
      } catch (error) {
        if (!isCancelled) {
          setSaveError(toDisplayError(error));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLayout();
    return () => {
      isCancelled = true;
    };
  }, [cms]);

  const saveLayout = useCallback(
    async (layout: DashboardWidgetLayoutState) => {
      if (!cms) return false;

      try {
        setIsSaving(true);
        setSaveError(null);
        await cms.settings.upsertSettingValue({
          path: { key: GLOBAL_DASHBOARD_WIDGET_LAYOUT_SETTING_KEY },
          body: {
            value: {
              version: layout.version,
              order: [...layout.order],
              hidden: [...layout.hidden],
              dimensions: { ...layout.dimensions }
            },
            updatedBy: "backoffice"
          }
        });
        setLayoutValue(layout);
        setLayoutVersion((current) => current + 1);
        pushToast({
          tone: "success",
          title: "Layout salvato",
          description: "La nuova panoramica è disponibile per tutti gli amministratori.",
          duration: 4000
        });
        return true;
      } catch (error) {
        const message = toDisplayError(error);
        setSaveError(message);
        pushToast({
          tone: "danger",
          title: "Salvataggio non riuscito",
          description: message,
          duration: 0
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [cms, pushToast]
  );

  return { isLoading, isSaving, layoutValue, layoutVersion, saveError, saveLayout };
}
