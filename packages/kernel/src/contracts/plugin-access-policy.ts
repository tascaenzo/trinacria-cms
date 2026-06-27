import type { SecureEventPayloadRecord } from "./secure-event-payloads.js";
import type { PluginManifestEmittedEvent } from "./plugin-manifest.js";

export type PluginAccessGrantStatus = "pending" | "approved" | "denied" | "revoked";

export interface PluginAccessGrant {
  producerPluginId: string;
  consumerPluginId: string;
  eventName: string;
  payloadType?: string;
  requiredPermission: string;
  status: PluginAccessGrantStatus;
  reason?: string;
  approvedBy?: string;
  approvedAt?: string;
  updatedAt?: string;
}

export interface PluginEventSubscriptionAuthorizationRequest {
  subscriberPluginId: string;
  eventName: string;
  eventOwnerPluginId: string;
  eventVisibility: PluginManifestEmittedEvent["visibility"];
  requiredPermission: string;
}

export interface PluginAccessAuthorizationResult {
  allowed: boolean;
  reason?: string;
}

export interface PluginEventSubscriptionAuthorizer {
  canSubscribe(
    request: PluginEventSubscriptionAuthorizationRequest
  ): Promise<PluginAccessAuthorizationResult> | PluginAccessAuthorizationResult;
}

export interface SecureEventPayloadAuthorizationRequest {
  payload: SecureEventPayloadRecord;
  consumerPluginId: string;
  eventName: string;
  requiredPermission: string;
  decision: "allow" | "deny";
  reason?: string;
}

export interface SecureEventPayloadAuthorizer {
  canClaim(
    request: SecureEventPayloadAuthorizationRequest
  ): Promise<PluginAccessAuthorizationResult> | PluginAccessAuthorizationResult;
}
