import type {
  ExecutePluginOperationResponse,
  ListInstalledPluginsResponse,
  ListPluginEventsResponse
} from "@trinacria-cms/sdk";

export type PluginSnapshot = ListInstalledPluginsResponse["data"][number];
export type PluginEvent = ListPluginEventsResponse["data"][number];
export type PluginOperation = ExecutePluginOperationResponse["data"]["operation"];
export type PluginOperationAvailability = PluginSnapshot["operations"][number];
