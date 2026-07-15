import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cms } from "../../runtime/cms-sdk.js";
import { toDisplayError } from "../../lib/sdk-errors.js";
import type { PluginOperation, PluginSnapshot } from "./plugin-operations.types.js";
import { reconcileSelectedPluginId } from "./plugin-operations-utils.js";

/**
 * Keeps the plugin inventory and its lifecycle feed consistent. Each response
 * receives a monotonic request id so a slower request can never overwrite a
 * newer plugin selection.
 */
export function usePluginOperations({ includeEvents = true }: { includeEvents?: boolean } = {}) {
  const [plugins, setPlugins] = useState<readonly PluginSnapshot[]>([]);
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const [events, setEvents] = useState<
    readonly import("./plugin-operations.types.js").PluginEvent[]
  >([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [isRunningOperation, setIsRunningOperation] = useState<PluginOperation | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const inventoryRequestId = useRef(0);
  const eventsRequestId = useRef(0);

  const selectedPlugin = useMemo(
    () => plugins.find((plugin) => plugin.id === selectedPluginId) ?? plugins[0] ?? null,
    [plugins, selectedPluginId]
  );
  const selectedPluginKey = selectedPlugin?.id;

  const refreshPlugins = useCallback(async () => {
    const requestId = ++inventoryRequestId.current;
    setIsInventoryLoading(true);
    setInventoryError(null);

    try {
      const response = await cms.system.listInstalledPlugins();
      if (requestId !== inventoryRequestId.current) return response.data;

      setPlugins(response.data);
      setSelectedPluginId((current) => reconcileSelectedPluginId(response.data, current));
      return response.data;
    } catch (error) {
      if (requestId === inventoryRequestId.current) {
        setInventoryError(toDisplayError(error));
      }
      return [];
    } finally {
      if (requestId === inventoryRequestId.current) {
        setIsInventoryLoading(false);
      }
    }
  }, []);

  const refreshEvents = useCallback(async (pluginId: string) => {
    const requestId = ++eventsRequestId.current;
    setIsEventsLoading(true);
    setEventsError(null);

    try {
      const response = await cms.system.listPluginEvents({ path: { pluginId } });
      if (requestId === eventsRequestId.current) {
        setEvents(response.data);
      }
    } catch (error) {
      if (requestId === eventsRequestId.current) {
        setEventsError(toDisplayError(error));
        setEvents([]);
      }
    } finally {
      if (requestId === eventsRequestId.current) {
        setIsEventsLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshPlugins(),
      includeEvents && selectedPlugin ? refreshEvents(selectedPlugin.id) : Promise.resolve()
    ]);
  }, [includeEvents, refreshEvents, refreshPlugins, selectedPlugin]);

  const executeOperation = useCallback(
    async (pluginId: string, operation: PluginOperation, reason?: string) => {
      setIsRunningOperation(operation);
      setOperationError(null);

      try {
        const response = await cms.system.executePluginOperation({
          path: { pluginId },
          body: { operation, ...(reason ? { reason } : {}) }
        });
        await Promise.all([
          refreshPlugins(),
          includeEvents ? refreshEvents(pluginId) : Promise.resolve()
        ]);
        return response.data;
      } catch (error) {
        setOperationError(toDisplayError(error));
        return null;
      } finally {
        setIsRunningOperation(null);
      }
    },
    [includeEvents, refreshEvents, refreshPlugins]
  );

  useEffect(() => {
    void refreshPlugins();
  }, [refreshPlugins]);

  useEffect(() => {
    if (!includeEvents) return;
    if (!selectedPluginKey) {
      eventsRequestId.current += 1;
      setEvents([]);
      setEventsError(null);
      setIsEventsLoading(false);
      return;
    }

    void refreshEvents(selectedPluginKey);
  }, [includeEvents, refreshEvents, selectedPluginKey]);

  useEffect(
    () => () => {
      inventoryRequestId.current += 1;
      eventsRequestId.current += 1;
    },
    []
  );

  return {
    plugins,
    selectedPlugin,
    selectedPluginId,
    events,
    isInventoryLoading,
    isEventsLoading,
    isRunningOperation,
    inventoryError,
    eventsError,
    operationError,
    setSelectedPluginId,
    refresh,
    executeOperation
  };
}
