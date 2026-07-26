import { InfoCard, ResourcePage } from "@trinacria-cms/trinacria-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminResourceDefinition } from "../../contracts.js";
import type { AdminPageRenderContext } from "../../runtime/admin-route-runtime.js";
import {
  clearBackofficeRouteStateParams,
  getBackofficeNavigationEventName,
  getBackofficeRouteStateParam,
  setBackofficeRouteStateParam
} from "../../runtime/backoffice-navigation-state.js";
import { useDeclarativeActionController } from "../hooks/use-declarative-action-controller.js";
import type { DeclarativeDataController } from "../types.js";
import { getRecordIdentity } from "../utils/formatting.js";
import { extractRecordList } from "../utils/resource.js";
import { DeclarativeResourceDetail } from "./declarative-resource-detail.js";
import { DeclarativeResourceTable } from "./declarative-resource-table.js";

const RECORD_ROUTE_PARAM = "record";

export function DeclarativeResourcePage({
  context,
  dataState,
  resource
}: {
  context: AdminPageRenderContext;
  dataState: DeclarativeDataController;
  resource?: AdminResourceDefinition;
}) {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(() =>
    getBackofficeRouteStateParam(RECORD_ROUTE_PARAM)
  );
  const [selectedRecordFallback, setSelectedRecordFallback] = useState<unknown | null>(null);
  const actionController = useDeclarativeActionController({
    onSuccess: dataState.refetch,
    t: context.t
  });
  const detailEnabled = resource?.detail !== false;
  const records = useMemo(
    () =>
      extractRecordList(
        dataState.status === "success" ? dataState.data : undefined,
        context.route.data?.valuePath
      ),
    [context.route.data?.valuePath, dataState]
  );
  const selectedRecord = selectedRecordId
    ? (records.find((record) => getRecordIdentity(record) === selectedRecordId) ?? null)
    : selectedRecordFallback;

  useEffect(() => {
    function handleNavigationChange() {
      setSelectedRecordId(getBackofficeRouteStateParam(RECORD_ROUTE_PARAM));
      setSelectedRecordFallback(null);
    }

    const navigationEventName = getBackofficeNavigationEventName();
    window.addEventListener(navigationEventName, handleNavigationChange);
    window.addEventListener("popstate", handleNavigationChange);
    return () => {
      window.removeEventListener(navigationEventName, handleNavigationChange);
      window.removeEventListener("popstate", handleNavigationChange);
    };
  }, []);

  useEffect(() => {
    if (
      selectedRecordId &&
      dataState.status === "success" &&
      !records.some((record) => getRecordIdentity(record) === selectedRecordId)
    ) {
      setSelectedRecordId(null);
      clearBackofficeRouteStateParams([RECORD_ROUTE_PARAM], "replace");
    }
  }, [dataState.status, records, selectedRecordId]);

  const handleOpenRecord = useCallback((record: unknown) => {
    const recordId = getRecordIdentity(record);
    if (recordId) {
      setSelectedRecordFallback(null);
      setSelectedRecordId(recordId);
      setBackofficeRouteStateParam(RECORD_ROUTE_PARAM, recordId);
      return;
    }

    setSelectedRecordId(null);
    setSelectedRecordFallback(record);
    clearBackofficeRouteStateParams([RECORD_ROUTE_PARAM], "replace");
  }, []);

  const handleCloseRecord = useCallback(() => {
    setSelectedRecordId(null);
    setSelectedRecordFallback(null);
    clearBackofficeRouteStateParams([RECORD_ROUTE_PARAM]);
  }, []);

  return (
    <ResourcePage>
      {dataState.status === "loading" ? (
        <InfoCard
          title="Loading resource data"
          description="The declarative renderer is reading the endpoint declared by this resource page."
          className="bg-[color:var(--color-surface)]"
        />
      ) : null}
      {dataState.status === "error" ? (
        <InfoCard
          title="Unable to load resource data"
          description={dataState.error}
          tone="dashed"
          className="bg-[color:var(--color-surface)]"
        />
      ) : null}
      {resource && selectedRecord && detailEnabled ? (
        <DeclarativeResourceDetail
          onBack={handleCloseRecord}
          onPrepareAction={actionController.prepareAction}
          record={selectedRecord}
          resource={resource}
          t={context.t}
        />
      ) : resource ? (
        <DeclarativeResourceTable
          binding={context.route.data}
          dataState={dataState}
          onOpenRecord={detailEnabled ? handleOpenRecord : undefined}
          onRefresh={dataState.refetch}
          onPrepareAction={actionController.prepareAction}
          resource={resource}
          t={context.t}
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
