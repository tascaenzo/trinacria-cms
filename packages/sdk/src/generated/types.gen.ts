/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

export type AssignUserRoleRequest = {
  path: {
  "id": string;
};
  body: {
  "roleCode": string;
};
};

export type AssignUserRoleResponse = {
  "data": {
  "id": string;
  "userId": string;
  "roleCode": string;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type BootstrapInstallationRequest = {
  body: {
  "email": string;
  "displayName": string;
  "password": string;
};
};

export type BootstrapInstallationResponse = {
  "data": {
  "status": {
  "installed": boolean;
  "installedAt"?: string;
  "adminUserId"?: string;
};
  "adminUser": {
  "id": string;
  "email": string;
  "displayName": string;
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type CreateApiKeyRequest = {
  body: {
  "name": string;
  "description"?: string;
  "kind"?: "publishable" | "secret" | "service";
  "roleCodes"?: Array<string>;
  "permissionKeys"?: Array<string>;
  "policyRules"?: Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
}>;
  "expiresAt"?: string;
};
};

export type CreateApiKeyResponse = {
  "data": {
  "record": {
  "id": string;
  "keyPrefix": string;
  "secretPreview": string;
  "name": string;
  "description"?: string;
  "kind": "publishable" | "secret" | "service";
  "status": "active" | "revoked";
  "roleCodes": Array<string>;
  "permissionKeys": Array<string>;
  "policyRules": Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
}>;
  "createdAt": string;
  "updatedAt": string;
  "lastUsedAt"?: string;
  "expiresAt"?: string;
  "revokedAt"?: string;
};
  "apiKey": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type CreatePermissionRequest = {
  body: {
  "key": string;
  "displayName": string;
  "description"?: string;
};
};

export type CreatePermissionResponse = {
  "data": {
  "id": string;
  "key": string;
  "displayName": string;
  "description"?: string;
  "sourcePluginId": string;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type CreateRoleRequest = {
  body: {
  "code": string;
  "name": string;
  "description"?: string;
  "permissions"?: Array<string>;
};
};

export type CreateRoleResponse = {
  "data": {
  "id": string;
  "code": string;
  "name": string;
  "description"?: string;
  "ownerPluginId"?: string;
  "permissions"?: Array<string>;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type CreateRolePolicyRuleRequest = {
  path: {
  "roleCode": string;
};
  body: {
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions"?: Array<"resource_id_required" | "resource_id_equals_subject">;
};
};

export type CreateRolePolicyRuleResponse = {
  "data": {
  "id": string;
  "roleCode": string;
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type CreateUserRequest = {
  body: {
  "email": string;
  "displayName": string;
};
};

export type CreateUserResponse = {
  "data": {
  "id": string;
  "email": string;
  "displayName": string;
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type DeleteRolePolicyRuleRequest = {
  path: {
  "roleCode": string;
  "ruleId": string;
};
};

export type DeleteRolePolicyRuleResponse = {
  "data": Array<{
  "id": string;
  "roleCode": string;
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ExecutePluginOperationRequest = {
  path: {
  "pluginId": string;
};
  body: {
  "operation": "load" | "unload" | "reload" | "disable" | "enable";
  "reason"?: string;
};
};

export type ExecutePluginOperationResponse = {
  "data": {
  "plugin": {
  "id": string;
  "version": string;
  "requiresCore": string;
  "state": "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
  "capabilities": Array<string>;
  "dependencies": Array<{
  "pluginId": string;
  "versionRange": string;
  "optional": boolean;
  "status": "ok" | "missing" | "disabled" | "version-mismatch";
  "currentVersion"?: string;
  "state"?: "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
  "reason"?: string;
}>;
  "security": {
  "permissions": number;
  "roles": number;
  "grants": number;
  "policyRules": number;
};
  "failureCount": number;
  "failedAt"?: string;
  "lastFailurePhase"?: "register" | "dependency-check" | "load" | "init" | "unload" | "rollback";
  "disabledAt"?: string;
  "disabledReason"?: string;
  "loadedAt"?: string;
  "statusReason"?: {
  "code": string;
  "message": string;
};
  "lastError"?: {
  "name": string;
  "message": string;
  "code"?: string;
};
  "operations": Array<{
  "operation": "load" | "unload" | "reload" | "disable" | "enable";
  "available": boolean;
  "reason"?: string;
}>;
};
  "operation": "load" | "unload" | "reload" | "disable" | "enable";
  "executedAt": string;
};
  "meta"?: {
  "pluginId"?: "kernel";
  "count"?: number;
};
};

export type ExportPluginSettingsRequest = {
  path: {
  "pluginId": string;
};
};

export type ExportPluginSettingsResponse = {
  "data": {
  "pluginId": string;
  "definitions": Array<{
  "id": string;
  "key": string;
  "ownerPluginId": string;
  "category"?: string;
  "description"?: string;
  "schema"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "defaultValue"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
}>;
  "values": Array<{
  "id": string;
  "key": string;
  "ownerPluginId": string;
  "value": string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "version": number;
  "updatedBy"?: string;
  "createdAt": string;
  "updatedAt": string;
}>;
  "secrets": Array<{
  "id": string;
  "key": string;
  "ownerPluginId": string;
  "algorithm": "aes-256-gcm";
  "keyVersion": string;
  "maskedValue": string;
  "updatedBy"?: string;
  "createdAt": string;
  "updatedAt": string;
}>;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type GetApiKeyByIdRequest = {
  path: {
  "id": string;
};
};

export type GetApiKeyByIdResponse = {
  "data": {
  "id": string;
  "keyPrefix": string;
  "secretPreview": string;
  "name": string;
  "description"?: string;
  "kind": "publishable" | "secret" | "service";
  "status": "active" | "revoked";
  "roleCodes": Array<string>;
  "permissionKeys": Array<string>;
  "policyRules": Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
}>;
  "createdAt": string;
  "updatedAt": string;
  "lastUsedAt"?: string;
  "expiresAt"?: string;
  "revokedAt"?: string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type GetAuthenticatedUserRequest = void;

export type GetAuthenticatedUserResponse = {
  "data": {
  "id": string;
  "email": string;
  "displayName": string;
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type GetInstallationStatusRequest = void;

export type GetInstallationStatusResponse = {
  "data": {
  "installed": boolean;
  "installedAt"?: string;
  "adminUserId"?: string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type GetInstalledPluginRequest = {
  path: {
  "pluginId": string;
};
};

export type GetInstalledPluginResponse = {
  "data": {
  "id": string;
  "version": string;
  "requiresCore": string;
  "state": "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
  "capabilities": Array<string>;
  "dependencies": Array<{
  "pluginId": string;
  "versionRange": string;
  "optional": boolean;
  "status": "ok" | "missing" | "disabled" | "version-mismatch";
  "currentVersion"?: string;
  "state"?: "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
  "reason"?: string;
}>;
  "security": {
  "permissions": number;
  "roles": number;
  "grants": number;
  "policyRules": number;
};
  "failureCount": number;
  "failedAt"?: string;
  "lastFailurePhase"?: "register" | "dependency-check" | "load" | "init" | "unload" | "rollback";
  "disabledAt"?: string;
  "disabledReason"?: string;
  "loadedAt"?: string;
  "statusReason"?: {
  "code": string;
  "message": string;
};
  "lastError"?: {
  "name": string;
  "message": string;
  "code"?: string;
};
  "operations": Array<{
  "operation": "load" | "unload" | "reload" | "disable" | "enable";
  "available": boolean;
  "reason"?: string;
}>;
};
  "meta"?: {
  "pluginId"?: "kernel";
  "count"?: number;
};
};

export type GetKernelDependencyGraphRequest = void;

export type GetKernelDependencyGraphResponse = {
  "nodes": Array<{
  "pluginId": string;
  "state": string;
  "version": string;
}>;
  "edges": Array<{
  "from": string;
  "to": string;
  "status": string;
  "optional": boolean;
  "reason"?: string;
}>;
  "warnings": Array<string>;
};

export type GetKernelHealthRequest = void;

export type GetKernelHealthResponse = {
  "timestamp": string;
  "status": "ok" | "degraded" | "down";
  "runtime": {
  "totalPlugins": number;
  "byState": {
  "registered": number;
  "loading": number;
  "initializing": number;
  "loaded": number;
  "unloading": number;
  "failed": number;
  "disabled": number;
  "unloaded": number;
};
};
  "dependencies": {
  "nodes": Array<{
  "pluginId": string;
  "state": string;
  "version": string;
}>;
  "edges": Array<{
  "from": string;
  "to": string;
  "status": string;
  "optional": boolean;
  "reason"?: string;
}>;
  "warnings": Array<string>;
};
  "db": {
  "ok": boolean;
  "reason"?: string;
};
  "issues": Array<string>;
};

export type GetPermissionByIdRequest = {
  path: {
  "id": string;
};
};

export type GetPermissionByIdResponse = {
  "data": {
  "id": string;
  "key": string;
  "displayName": string;
  "description"?: string;
  "sourcePluginId": string;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type GetRoleByIdRequest = {
  path: {
  "id": string;
};
};

export type GetRoleByIdResponse = {
  "data": {
  "id": string;
  "code": string;
  "name": string;
  "description"?: string;
  "ownerPluginId"?: string;
  "permissions"?: Array<string>;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type GetSettingDefinitionByKeyRequest = {
  path: {
  "key": string;
};
};

export type GetSettingDefinitionByKeyResponse = {
  "data": {
  "id": string;
  "key": string;
  "ownerPluginId": string;
  "category"?: string;
  "description"?: string;
  "schema"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "defaultValue"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type GetSettingSecretMetadataRequest = {
  path: {
  "key": string;
};
};

export type GetSettingSecretMetadataResponse = {
  "data": {
  "id": string;
  "key": string;
  "ownerPluginId": string;
  "algorithm": "aes-256-gcm";
  "keyVersion": string;
  "maskedValue": string;
  "updatedBy"?: string;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type GetSettingValueByKeyRequest = {
  path: {
  "key": string;
};
};

export type GetSettingValueByKeyResponse = {
  "data": {
  "key": string;
  "ownerPluginId": string;
  "value": string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "source": "value" | "default";
  "version"?: number;
  "updatedAt": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type GetUserByIdRequest = {
  path: {
  "id": string;
};
};

export type GetUserByIdResponse = {
  "data": {
  "id": string;
  "email": string;
  "displayName": string;
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListApiKeysRequest = {
  query: {
  "kind"?: "publishable" | "secret" | "service";
  "status"?: "active" | "revoked";
  "limit"?: number;
  "offset"?: number;
};
};

export type ListApiKeysResponse = {
  "data": Array<{
  "id": string;
  "keyPrefix": string;
  "secretPreview": string;
  "name": string;
  "description"?: string;
  "kind": "publishable" | "secret" | "service";
  "status": "active" | "revoked";
  "roleCodes": Array<string>;
  "permissionKeys": Array<string>;
  "policyRules": Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
}>;
  "createdAt": string;
  "updatedAt": string;
  "lastUsedAt"?: string;
  "expiresAt"?: string;
  "revokedAt"?: string;
}>;
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListInstalledCapabilitiesRequest = void;

export type ListInstalledCapabilitiesResponse = {
  "data": Array<{
  "pluginId": string;
  "capability": string;
  "version": string;
  "state": "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
}>;
  "meta"?: {
  "pluginId"?: "kernel";
  "count"?: number;
};
};

export type ListInstalledPluginsRequest = void;

export type ListInstalledPluginsResponse = {
  "data": Array<{
  "id": string;
  "version": string;
  "requiresCore": string;
  "state": "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
  "capabilities": Array<string>;
  "dependencies": Array<{
  "pluginId": string;
  "versionRange": string;
  "optional": boolean;
  "status": "ok" | "missing" | "disabled" | "version-mismatch";
  "currentVersion"?: string;
  "state"?: "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
  "reason"?: string;
}>;
  "security": {
  "permissions": number;
  "roles": number;
  "grants": number;
  "policyRules": number;
};
  "failureCount": number;
  "failedAt"?: string;
  "lastFailurePhase"?: "register" | "dependency-check" | "load" | "init" | "unload" | "rollback";
  "disabledAt"?: string;
  "disabledReason"?: string;
  "loadedAt"?: string;
  "statusReason"?: {
  "code": string;
  "message": string;
};
  "lastError"?: {
  "name": string;
  "message": string;
  "code"?: string;
};
  "operations": Array<{
  "operation": "load" | "unload" | "reload" | "disable" | "enable";
  "available": boolean;
  "reason"?: string;
}>;
}>;
  "meta"?: {
  "pluginId"?: "kernel";
  "count"?: number;
};
};

export type ListPermissionsRequest = {
  query: {
  "limit"?: number;
  "offset"?: number;
};
};

export type ListPermissionsResponse = {
  "data": Array<{
  "id": string;
  "key": string;
  "displayName": string;
  "description"?: string;
  "sourcePluginId": string;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListPluginContributionsRequest = void;

export type ListPluginContributionsResponse = {
  "data": {
  "entities": Array<{
  "pluginId": string;
  "key": string;
  "declaration": Record<string, unknown>;
}>;
  "settings": Array<{
  "pluginId": string;
  "key": string;
  "declaration": Record<string, unknown>;
}>;
  "events": {
  "emits": Array<{
  "pluginId": string;
  "key": string;
  "declaration": Record<string, unknown>;
}>;
  "subscribes": Array<{
  "pluginId": string;
  "key": string;
  "declaration": Record<string, unknown>;
}>;
};
  "admin": {
  "navigation": Array<{
  "pluginId": string;
  "key": string;
  "declaration": Record<string, unknown>;
}>;
  "routes": Array<{
  "pluginId": string;
  "key": string;
  "declaration": Record<string, unknown>;
}>;
  "resources": Array<{
  "pluginId": string;
  "key": string;
  "declaration": Record<string, unknown>;
}>;
  "widgets": Array<{
  "pluginId": string;
  "key": string;
  "declaration": Record<string, unknown>;
}>;
  "settingsSections": Array<{
  "pluginId": string;
  "key": string;
  "declaration": Record<string, unknown>;
}>;
};
};
  "meta"?: {
  "pluginId"?: "kernel";
  "count"?: number;
};
};

export type ListPluginEventsRequest = {
  path: {
  "pluginId": string;
};
};

export type ListPluginEventsResponse = {
  "data": Array<{
  "sequence": number;
  "timestamp": string;
  "pluginId": string;
  "action": "register" | "unregister" | "load" | "unload" | "reload" | "disable" | "enable" | "load-many";
  "success": boolean;
  "phase"?: "register" | "dependency-check" | "load" | "init" | "unload" | "rollback";
  "message"?: string;
  "durationMs"?: number;
  "stateBefore"?: "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
  "stateAfter"?: "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
}>;
  "meta"?: {
  "pluginId"?: "kernel";
  "count"?: number;
};
};

export type ListPluginSourcesRequest = void;

export type ListPluginSourcesResponse = {
  "data": Array<{
  "type": "workspace" | "package" | "local-path";
  "name": string;
  "entrypoint": string;
  "status": "discovered" | "failed" | "disabled";
  "pluginId"?: string;
  "error"?: string;
}>;
  "meta"?: {
  "pluginId"?: "kernel";
  "count"?: number;
};
};

export type ListRolePolicyRulesRequest = {
  path: {
  "roleCode": string;
};
};

export type ListRolePolicyRulesResponse = {
  "data": Array<{
  "id": string;
  "roleCode": string;
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListRolesRequest = {
  query: {
  "limit"?: number;
  "offset"?: number;
};
};

export type ListRolesResponse = {
  "data": Array<{
  "id": string;
  "code": string;
  "name": string;
  "description"?: string;
  "ownerPluginId"?: string;
  "permissions"?: Array<string>;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListSettingDefinitionsRequest = {
  query: {
  "ownerPluginId"?: string;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListSettingDefinitionsResponse = {
  "data": Array<{
  "id": string;
  "key": string;
  "ownerPluginId": string;
  "category"?: string;
  "description"?: string;
  "schema"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "defaultValue"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  [key: string]: unknown;
};
};

export type ListUserEffectivePermissionsRequest = {
  path: {
  "id": string;
};
};

export type ListUserEffectivePermissionsResponse = {
  "data": Array<string>;
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListUserRolesRequest = {
  path: {
  "id": string;
};
};

export type ListUserRolesResponse = {
  "data": Array<{
  "id": string;
  "userId": string;
  "roleCode": string;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListUsersRequest = {
  query: {
  "limit"?: number;
  "offset"?: number;
};
};

export type ListUsersResponse = {
  "data": Array<{
  "id": string;
  "email": string;
  "displayName": string;
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type LoginWithPasswordRequest = {
  body: {
  "email": string;
  "password": string;
};
};

export type LoginWithPasswordResponse = {
  "data": {
  "accessToken": string;
  "refreshToken": string;
  "tokenType": "Bearer";
  "expiresAt": string;
  "refreshExpiresAt": string;
  "user": {
  "id": string;
  "email": string;
  "displayName": string;
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type LogoutSessionRequest = void;

export type LogoutSessionResponse = {
  "data": {
  "revoked": boolean;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type RemoveUserRoleRequest = {
  path: {
  "id": string;
  "roleCode": string;
};
};

export type RemoveUserRoleResponse = {
  "data": Array<{
  "id": string;
  "userId": string;
  "roleCode": string;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type RevealSettingSecretRequest = {
  path: {
  "key": string;
};
};

export type RevealSettingSecretResponse = {
  "data": {
  "key": string;
  "value": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type RevokeApiKeyRequest = {
  path: {
  "id": string;
};
  body: {
  "reason"?: string;
};
};

export type RevokeApiKeyResponse = {
  "data": {
  "id": string;
  "keyPrefix": string;
  "secretPreview": string;
  "name": string;
  "description"?: string;
  "kind": "publishable" | "secret" | "service";
  "status": "active" | "revoked";
  "roleCodes": Array<string>;
  "permissionKeys": Array<string>;
  "policyRules": Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
}>;
  "createdAt": string;
  "updatedAt": string;
  "lastUsedAt"?: string;
  "expiresAt"?: string;
  "revokedAt"?: string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type RotateApiKeyRequest = {
  path: {
  "id": string;
};
  body: {
  "name"?: string;
  "description"?: string;
  "roleCodes"?: Array<string>;
  "permissionKeys"?: Array<string>;
  "policyRules"?: Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
}>;
  "expiresAt"?: string;
};
};

export type RotateApiKeyResponse = {
  "data": {
  "record": {
  "id": string;
  "keyPrefix": string;
  "secretPreview": string;
  "name": string;
  "description"?: string;
  "kind": "publishable" | "secret" | "service";
  "status": "active" | "revoked";
  "roleCodes": Array<string>;
  "permissionKeys": Array<string>;
  "policyRules": Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
}>;
  "createdAt": string;
  "updatedAt": string;
  "lastUsedAt"?: string;
  "expiresAt"?: string;
  "revokedAt"?: string;
};
  "apiKey": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type UpdatePermissionStatusRequest = {
  path: {
  "id": string;
};
  body: {
  "status": "active" | "disabled";
};
};

export type UpdatePermissionStatusResponse = {
  "data": {
  "id": string;
  "key": string;
  "displayName": string;
  "description"?: string;
  "sourcePluginId": string;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type UpdateRolePolicyRuleRequest = {
  path: {
  "roleCode": string;
  "ruleId": string;
};
  body: {
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions"?: Array<"resource_id_required" | "resource_id_equals_subject">;
};
};

export type UpdateRolePolicyRuleResponse = {
  "data": {
  "id": string;
  "roleCode": string;
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type UpdateRoleStatusRequest = {
  path: {
  "id": string;
};
  body: {
  "status": "active" | "disabled";
};
};

export type UpdateRoleStatusResponse = {
  "data": {
  "id": string;
  "code": string;
  "name": string;
  "description"?: string;
  "ownerPluginId"?: string;
  "permissions"?: Array<string>;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type UpdateUserStatusRequest = {
  path: {
  "id": string;
};
  body: {
  "status": "active" | "suspended";
};
};

export type UpdateUserStatusResponse = {
  "data": {
  "id": string;
  "email": string;
  "displayName": string;
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type UpsertSettingDefinitionRequest = {
  body: {
  "key": string;
  "category"?: string;
  "description"?: string;
  "schema"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "defaultValue"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
};
};

export type UpsertSettingDefinitionResponse = {
  "data": {
  "id": string;
  "key": string;
  "ownerPluginId": string;
  "category"?: string;
  "description"?: string;
  "schema"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "defaultValue"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type UpsertSettingSecretRequest = {
  path: {
  "key": string;
};
  body: {
  "plaintext": string;
  "updatedBy"?: string;
};
};

export type UpsertSettingSecretResponse = {
  "data": {
  "id": string;
  "key": string;
  "ownerPluginId": string;
  "algorithm": "aes-256-gcm";
  "keyVersion": string;
  "maskedValue": string;
  "updatedBy"?: string;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type UpsertSettingValueRequest = {
  path: {
  "key": string;
};
  body: {
  "value": string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "updatedBy"?: string;
};
};

export type UpsertSettingValueResponse = {
  "data": {
  "id": string;
  "key": string;
  "ownerPluginId": string;
  "value": string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "version": number;
  "updatedBy"?: string;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};
