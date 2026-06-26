import type {
  PluginManifestEmittedEvent,
  PluginManifestEventSubscription,
  PluginManifestEvents
} from "../contracts/plugin-manifest.js";
import { omitEmptyArray } from "./naming.js";

export function defineEmittedEvent(input: PluginManifestEmittedEvent): PluginManifestEmittedEvent {
  return {
    name: input.name.trim(),
    visibility: input.visibility,
    version: input.version,
    ...(input.delivery !== undefined ? { delivery: input.delivery } : {}),
    ...(input.payloadSchema !== undefined ? { payloadSchema: input.payloadSchema } : {})
  };
}

export function defineEventSubscription(
  input: PluginManifestEventSubscription
): PluginManifestEventSubscription {
  return {
    eventName: input.eventName.trim(),
    handler: input.handler,
    ...(input.requiredPermission !== undefined
      ? { requiredPermission: input.requiredPermission }
      : {})
  };
}

export function defineEvents(input: PluginManifestEvents): PluginManifestEvents {
  const emits = omitEmptyArray(input.emits);
  const subscribes = omitEmptyArray(input.subscribes);

  return {
    ...(emits !== undefined ? { emits } : {}),
    ...(subscribes !== undefined ? { subscribes } : {})
  };
}
