import type { PluginRuntimeOperation } from "./plugin-runtime.js";
export interface PluginArtifact {
  version: string;
  checksum: string;
}
export interface PluginDesiredState {
  pluginId: string;
  artifactVersion: string;
  artifactChecksum: string;
  enabled: boolean;
  revision: number;
  updatedBy: string;
  reason: string;
  updatedAt: string;
}
export interface PluginInstanceObservation {
  instanceId: string;
  observedRevision: number;
  state: "loaded" | "disabled" | "failed";
  reason?: string;
  healthy: boolean;
  artifactVersion: string;
  artifactChecksum: string;
}
export interface PluginClusterSnapshot {
  desired: PluginDesiredState;
  instances: readonly PluginInstanceObservation[];
}
export interface PluginClusterOperation {
  operationId: string;
  pluginId: string;
  operation: PluginRuntimeOperation;
  desiredRevision: number;
  status: "pending" | "succeeded" | "failed" | "partial";
  submittedAt: string;
  expiresAt: string;
  participants: readonly string[];
  instances: readonly PluginInstanceObservation[];
}
export interface PluginClusterOperationInput {
  operation: PluginRuntimeOperation;
  expectedRevision: number;
  idempotencyKey: string;
  reason?: string;
}
