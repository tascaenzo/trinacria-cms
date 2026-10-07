/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

export type AcceptUserInviteRequest = {
  body: {
  "token": string;
  "password": string;
};
};

export type AcceptUserInviteResponse = {
  "data": {
  "completed": true;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type ApproveEditorialEntryRequest = {
  path: {
  "id": string;
};
};

export type ApproveEditorialEntryResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type ApprovePluginGrantRequest = {
  path: {
  "id": string;
};
  body: {
  "expectedRevision": number;
  "reason": string;
};
};

export type ApprovePluginGrantResponse = {
  "data": {
  "id": string;
  "accessType": "api";
  "producerPluginId": string;
  "consumerPluginId": string;
  "target": string;
  "resource"?: string;
  "action"?: string;
  "operation"?: string;
  "payloadType": string;
  "workspaceId": string;
  "requiredPermission": string;
  "status": "pending" | "approved" | "denied" | "revoked";
  "revision": number;
  "reason"?: string;
  "approvedBy"?: string;
  "approvedAt"?: string;
  "revokedAt"?: string;
  "updatedAt": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

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

export type BeginLoginMfaEnrollmentRequest = {
  body: {
  "challengeId": string;
};
};

export type BeginLoginMfaEnrollmentResponse = {
  "data": {
  "manualKey": string;
  "otpauthUrl": string;
  "expiresAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type BeginMfaEnrollmentRequest = void;

export type BeginMfaEnrollmentResponse = {
  "data": {
  "manualKey": string;
  "otpauthUrl": string;
  "expiresAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type BootstrapInstallationRequest = {
  body: {
  "firstName": string;
  "lastName": string;
  "email": string;
  "password": string;
  "confirmPassword": string;
  "dataMode"?: "empty" | "demo";
  "siteName": string;
  "siteTagline"?: string;
  "locale"?: string;
  "timezone"?: string;
};
};

export type BootstrapInstallationResponse = {
  "data": {
  "status": {
  "installed": boolean;
  "phase": "prerequisites" | "ready" | "configuration" | "content" | "verification" | "complete";
  "canInstall": boolean;
  "restartRequired": boolean;
  "dataMode"?: "empty" | "demo";
  "checks": Array<{
  "id": "database" | "transactions" | "write-access" | "runtime-keys" | "plugins" | "services" | "administrator" | "settings";
  "status": "pass" | "fail" | "blocked";
  "message": string;
}>;
  "installedAt"?: string;
  "adminUserId"?: string;
  "envFilePresent": boolean;
  "dbConfigured": boolean;
  "envFilePath": string;
};
  "adminUser": {
  "id": string;
  "email": string;
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type CancelEventDeliveryRequest = {
  path: {
  "deliveryId": string;
};
  body: {
  "expectedEpoch": number;
  "reason": string;
};
};

export type CancelEventDeliveryResponse = {
  "data": {
  "id": string;
  "eventId": string;
  "ownerPluginId": string;
  "consumerPluginId": string;
  "handlerName": string;
  "handlerVersion": string;
  "eventName": string;
  "payloadVersion": number;
  "status": "pending" | "running" | "retry" | "succeeded" | "blocked" | "dead-letter" | "cancelled";
  "attempt": number;
  "epoch": number;
  "createdAt": string;
  "availableAt": string;
  "leaseOwner"?: string;
  "leaseUntil"?: string;
  "partitionKey"?: string;
  "sequence"?: number;
  "reason"?: string;
  "completedAt"?: string;
  "purgeAt"?: string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type CancelSecureEmailJobRequest = {
  path: {
  "jobId": string;
};
  body: {
  "expectedEpoch": number;
  "reason": string;
};
};

export type CancelSecureEmailJobResponse = {
  "data": {
  "id": string;
  "eventId": string;
  "ownerPluginId": string;
  "consumerPluginId": "email-pack";
  "expiresAt": string;
  "status": "pending" | "running" | "retry" | "succeeded" | "blocked" | "ambiguous" | "cancelled";
  "attempt": number;
  "epoch": number;
  "createdAt": string;
  "availableAt": string;
  "leaseOwner"?: string;
  "leaseUntil"?: string;
  "reason"?: string;
  "purgeAt"?: string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type ChangeAuthenticatedUserPasswordRequest = {
  body: {
  "currentPassword": string;
  "newPassword": string;
};
};

export type ChangeAuthenticatedUserPasswordResponse = {
  "data": {
  "id": string;
  "email": string;
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type CompleteLoginMfaEnrollmentRequest = {
  body: {
  "challengeId": string;
  "code": string;
};
};

export type CompleteLoginMfaEnrollmentResponse = {
  "data": {
  "accessToken": string;
  "tokenType": "Bearer";
  "expiresAt": string;
  "refreshExpiresAt": string;
  "user": {
  "id": string;
  "email": string;
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
  "recoveryCodes"?: Array<string>;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type CompleteMediaUploadRequest = {
  path: {
  "id": string;
};
};

export type CompleteMediaUploadResponse = {
  "data": {
  "id": string;
  "directoryId"?: string;
  "ownerUserId": string;
  "uploadedByUserId": string;
  "displayName": string;
  "originalFilename": string;
  "mimeType": string;
  "byteSize": number;
  "checksum": {
  "algorithm": "sha256";
  "value": string;
};
  "width"?: number;
  "height"?: number;
  "durationMs"?: number;
  "providerId": string;
  "storageKey": string;
  "status": "uploading" | "processing" | "ready" | "rejected" | "quarantined" | "deleted";
  "visibility": "private" | "restricted" | "public";
  "aclVersion": number;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type CompleteMfaLoginRequest = {
  body: {
  "challengeId": string;
  "code": string;
};
};

export type CompleteMfaLoginResponse = {
  "data": {
  "accessToken": string;
  "tokenType": "Bearer";
  "expiresAt": string;
  "refreshExpiresAt": string;
  "user": {
  "id": string;
  "email": string;
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
  "recoveryCodes"?: Array<string>;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type CompletePasswordResetRequest = {
  body: {
  "token": string;
  "newPassword": string;
};
};

export type CompletePasswordResetResponse = {
  "data": {
  "completed": true;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type ConfirmEmailVerificationRequest = {
  body: {
  "token": string;
};
};

export type ConfirmEmailVerificationResponse = {
  "data": {
  "completed": true;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type ConfirmMfaEnrollmentRequest = {
  body: {
  "code": string;
};
};

export type ConfirmMfaEnrollmentResponse = {
  "data": {
  "recoveryCodes": Array<string>;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type CreateEditorialContentTypeRequest = {
  body: {
  "key": string;
  "name": string;
  "description"?: string;
  "icon"?: string;
  "fields": ReadonlyArray<{
  "key": string;
  "label": string;
  "type": "text" | "rich_text" | "number" | "boolean" | "date_time" | "select" | "url" | "media" | "relation" | "json" | "repeatable";
  "required": boolean;
  "multiple": boolean;
  "helpText"?: string;
  "config"?: {
  "options"?: ReadonlyArray<string>;
  "targetContentTypeId"?: string;
  "allowedMimeTypes"?: ReadonlyArray<string>;
};
}>;
  "delivery"?: {
  "enabled": boolean;
  "publicFields": ReadonlyArray<string>;
  "exposeTitle": boolean;
  "exposeBody": boolean;
  "exposeSlug": boolean;
};
  "taxonomyIds"?: ReadonlyArray<string>;
  "workflowId"?: string;
  "workflow"?: {
  "preset": "review" | "direct" | "custom";
  "name"?: string;
  "states": ReadonlyArray<{
  "key": string;
  "label": string;
  "initial": boolean;
}>;
  "transitions": ReadonlyArray<{
  "key": string;
  "label": string;
  "from": string;
  "to": string;
  "requiredPermission"?: "submit" | "review" | "approve" | "publish";
}>;
};
  "ownershipScope"?: "inherit" | "own_entries" | "all_entries";
};
};

export type CreateEditorialContentTypeResponse = {
  "data": {
  "id": string;
  "key": string;
  "name": string;
  "description"?: string;
  "icon"?: string;
  "status": "active" | "archived";
  "fields": Array<{
  "key": string;
  "label": string;
  "type": "text" | "rich_text" | "number" | "boolean" | "date_time" | "select" | "url" | "media" | "relation" | "json" | "repeatable";
  "required": boolean;
  "multiple": boolean;
  "helpText"?: string;
  "config"?: {
  "options"?: Array<string>;
  "targetContentTypeId"?: string;
  "allowedMimeTypes"?: Array<string>;
};
}>;
  "taxonomyIds": Array<string>;
  "workflowId"?: string;
  "workflow"?: {
  "preset": "review" | "direct" | "custom";
  "name"?: string;
  "states": Array<{
  "key": string;
  "label": string;
  "initial": boolean;
}>;
  "transitions": Array<{
  "key": string;
  "label": string;
  "from": string;
  "to": string;
  "requiredPermission"?: "submit" | "review" | "approve" | "publish";
}>;
};
  "showInMainNavigation"?: boolean;
  "ownershipScope": "inherit" | "own_entries" | "all_entries";
  "version": number;
  "delivery"?: {
  "enabled": boolean;
  "publicFields": Array<string>;
  "exposeTitle": boolean;
  "exposeBody": boolean;
  "exposeSlug": boolean;
};
  "deliveryConfigVersion"?: number;
  "createdByUserId": string;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type CreateEditorialEntryRequest = {
  body: {
  "contentTypeId": string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": ReadonlyArray<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": ReadonlyArray<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": ReadonlyArray<ReadonlyArray<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": ReadonlyArray<{
  "id": string;
  "blocks": ReadonlyArray<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": ReadonlyArray<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": ReadonlyArray<ReadonlyArray<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": ReadonlyArray<{
  "id": string;
  "blocks": ReadonlyArray<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": ReadonlyArray<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": ReadonlyArray<ReadonlyArray<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": ReadonlyArray<{
  "id": string;
  "blocks": ReadonlyArray<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": ReadonlyArray<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": ReadonlyArray<ReadonlyArray<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "reviewerUserId"?: string;
  "scheduledAt"?: string;
};
};

export type CreateEditorialEntryResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type CreateEditorialEntryRevisionRequest = {
  path: {
  "id": string;
};
};

export type CreateEditorialEntryRevisionResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type CreateEditorialPreviewTokenRequest = {
  path: {
  "id": string;
};
  body: {
  "siteId": string;
};
};

export type CreateEditorialPreviewTokenResponse = {
  "data": {
  "token": string;
  "entryId": string;
  "siteId": string;
  "formAction": string;
  "expiresAt": string;
};
};

export type CreateMediaAccessUrlRequest = {
  path: {
  "id": string;
};
  query?: {
  "expiresInSeconds"?: number;
};
};

export type CreateMediaAccessUrlResponse = {
  "data": {
  "url": string;
  "expiresAt": string;
};
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type CreateMediaDirectoryRequest = {
  body: {
  "name"?: string;
  "parentId"?: string;
  "clearParent"?: boolean;
  "visibility"?: "private" | "restricted" | "public";
  "inheritAcl"?: boolean;
};
};

export type CreateMediaDirectoryResponse = {
  "data": {
  "id": string;
  "parentId"?: string;
  "name": string;
  "ownerUserId": string;
  "visibility": "private" | "restricted" | "public";
  "inheritAcl": boolean;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId"?: "media-pack";
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

export type CreatePreviewSessionRequest = {
  body: {
  "token": string;
  "siteId": string;
  "origin": string;
};
};

export type CreatePreviewSessionResponse = {
  "data": {
  "sessionId": string;
  "entryId": string;
  "expiresAt": string;
};
};

export type CreateRoleRequest = {
  body: {
  "code": string;
  "name": string;
  "description"?: string;
  "permissions"?: ReadonlyArray<string>;
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
  "policyRules"?: Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
}>;
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
  "conditions"?: ReadonlyArray<"resource_id_required" | "resource_id_equals_subject">;
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
  "firstName": string;
  "lastName": string;
};
};

export type CreateUserResponse = {
  "data": {
  "id": string;
  "email": string;
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
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

export type DeleteEditorialContentTypeRequest = {
  path: {
  "id": string;
};
};

export type DeleteEditorialContentTypeResponse = {
  "data": {
  "id": string;
  "key": string;
  "name": string;
  "description"?: string;
  "icon"?: string;
  "status": "active" | "archived";
  "fields": Array<{
  "key": string;
  "label": string;
  "type": "text" | "rich_text" | "number" | "boolean" | "date_time" | "select" | "url" | "media" | "relation" | "json" | "repeatable";
  "required": boolean;
  "multiple": boolean;
  "helpText"?: string;
  "config"?: {
  "options"?: Array<string>;
  "targetContentTypeId"?: string;
  "allowedMimeTypes"?: Array<string>;
};
}>;
  "taxonomyIds": Array<string>;
  "workflowId"?: string;
  "workflow"?: {
  "preset": "review" | "direct" | "custom";
  "name"?: string;
  "states": Array<{
  "key": string;
  "label": string;
  "initial": boolean;
}>;
  "transitions": Array<{
  "key": string;
  "label": string;
  "from": string;
  "to": string;
  "requiredPermission"?: "submit" | "review" | "approve" | "publish";
}>;
};
  "showInMainNavigation"?: boolean;
  "ownershipScope": "inherit" | "own_entries" | "all_entries";
  "version": number;
  "delivery"?: {
  "enabled": boolean;
  "publicFields": Array<string>;
  "exposeTitle": boolean;
  "exposeBody": boolean;
  "exposeSlug": boolean;
};
  "deliveryConfigVersion"?: number;
  "createdByUserId": string;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type DeleteEditorialEntryRequest = {
  path: {
  "id": string;
};
};

export type DeleteEditorialEntryResponse = {
  "data": {
  "deleted": boolean;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type DeleteMediaAssetRequest = {
  path: {
  "id": string;
};
};

export type DeleteMediaAssetResponse = {
  "data": {
  "id": string;
  "directoryId"?: string;
  "ownerUserId": string;
  "uploadedByUserId": string;
  "displayName": string;
  "originalFilename": string;
  "mimeType": string;
  "byteSize": number;
  "checksum": {
  "algorithm": "sha256";
  "value": string;
};
  "width"?: number;
  "height"?: number;
  "durationMs"?: number;
  "providerId": string;
  "storageKey": string;
  "status": "uploading" | "processing" | "ready" | "rejected" | "quarantined" | "deleted";
  "visibility": "private" | "restricted" | "public";
  "aclVersion": number;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type DeleteMediaAssetShareRequest = {
  path: {
  "id": string;
  "shareId": string;
};
};

export type DeleteMediaAssetShareResponse = {
  "data": {
  "deleted": true;
};
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type DeleteMediaDirectoryRequest = {
  path: {
  "id": string;
};
};

export type DeleteMediaDirectoryResponse = {
  "data": {
  "id": string;
  "parentId"?: string;
  "name": string;
  "ownerUserId": string;
  "visibility": "private" | "restricted" | "public";
  "inheritAcl": boolean;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type DeleteMediaDirectoryShareRequest = {
  path: {
  "id": string;
  "shareId": string;
};
};

export type DeleteMediaDirectoryShareResponse = {
  "data": {
  "deleted": true;
};
  "meta"?: {
  "pluginId"?: "media-pack";
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

export type DeliverLocalMediaAssetRequest = {
  path: {
  "storageKey": string;
};
  query: {
  "expires": number;
  "signature": string;
};
};

export type DeliverLocalMediaAssetResponse = Uint8Array;

export type DenyPluginGrantRequest = {
  path: {
  "id": string;
};
  body: {
  "expectedRevision": number;
  "reason": string;
};
};

export type DenyPluginGrantResponse = {
  "data": {
  "id": string;
  "accessType": "api";
  "producerPluginId": string;
  "consumerPluginId": string;
  "target": string;
  "resource"?: string;
  "action"?: string;
  "operation"?: string;
  "payloadType": string;
  "workspaceId": string;
  "requiredPermission": string;
  "status": "pending" | "approved" | "denied" | "revoked";
  "revision": number;
  "reason"?: string;
  "approvedBy"?: string;
  "approvedAt"?: string;
  "revokedAt"?: string;
  "updatedAt": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type DisableMfaRequest = {
  body: {
  "currentPassword": string;
  "code": string;
};
};

export type DisableMfaResponse = {
  "data": {
  "disabled": true;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type ExecutePluginOperationRequest = {
  path: {
  "pluginId": string;
};
  body: {
  "operation": "load" | "unload" | "reload" | "disable" | "enable";
  "expectedRevision": number;
  "idempotencyKey": string;
  "reason"?: string;
};
};

export type ExecutePluginOperationResponse = {
  "data": {
  "operationId": string;
  "pluginId": string;
  "operation": "load" | "unload" | "reload" | "disable" | "enable";
  "desiredRevision": number;
  "status": "pending" | "succeeded" | "failed" | "partial";
  "submittedAt": string;
  "expiresAt": string;
  "participants": Array<string>;
  "instances": Array<{
  "instanceId": string;
  "observedRevision": number;
  "state": "loaded" | "disabled" | "failed";
  "reason"?: string;
  "healthy": boolean;
  "artifactVersion": string;
  "artifactChecksum": string;
}>;
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
  "visibility"?: "public" | "admin" | "internal";
  "mutable"?: boolean;
  "secret"?: boolean;
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

export type GetAuthenticatedUserRequest = void;

export type GetAuthenticatedUserResponse = {
  "data": {
  "id": string;
  "email": string;
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type GetEditorialContentTypeRequest = {
  path: {
  "id": string;
};
};

export type GetEditorialContentTypeResponse = {
  "data": {
  "id": string;
  "key": string;
  "name": string;
  "description"?: string;
  "icon"?: string;
  "status": "active" | "archived";
  "fields": Array<{
  "key": string;
  "label": string;
  "type": "text" | "rich_text" | "number" | "boolean" | "date_time" | "select" | "url" | "media" | "relation" | "json" | "repeatable";
  "required": boolean;
  "multiple": boolean;
  "helpText"?: string;
  "config"?: {
  "options"?: Array<string>;
  "targetContentTypeId"?: string;
  "allowedMimeTypes"?: Array<string>;
};
}>;
  "taxonomyIds": Array<string>;
  "workflowId"?: string;
  "workflow"?: {
  "preset": "review" | "direct" | "custom";
  "name"?: string;
  "states": Array<{
  "key": string;
  "label": string;
  "initial": boolean;
}>;
  "transitions": Array<{
  "key": string;
  "label": string;
  "from": string;
  "to": string;
  "requiredPermission"?: "submit" | "review" | "approve" | "publish";
}>;
};
  "showInMainNavigation"?: boolean;
  "ownershipScope": "inherit" | "own_entries" | "all_entries";
  "version": number;
  "delivery"?: {
  "enabled": boolean;
  "publicFields": Array<string>;
  "exposeTitle": boolean;
  "exposeBody": boolean;
  "exposeSlug": boolean;
};
  "deliveryConfigVersion"?: number;
  "createdByUserId": string;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type GetEditorialEntryRequest = {
  path: {
  "id": string;
};
};

export type GetEditorialEntryResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type GetEventDeliveryRequest = {
  path: {
  "deliveryId": string;
};
};

export type GetEventDeliveryResponse = {
  "data": {
  "id": string;
  "eventId": string;
  "ownerPluginId": string;
  "consumerPluginId": string;
  "handlerName": string;
  "handlerVersion": string;
  "eventName": string;
  "payloadVersion": number;
  "status": "pending" | "running" | "retry" | "succeeded" | "blocked" | "dead-letter" | "cancelled";
  "attempt": number;
  "epoch": number;
  "createdAt": string;
  "availableAt": string;
  "leaseOwner"?: string;
  "leaseUntil"?: string;
  "partitionKey"?: string;
  "sequence"?: number;
  "reason"?: string;
  "completedAt"?: string;
  "purgeAt"?: string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type GetI18nBundleRequest = {
  path: {
  "locale": string;
};
  query?: {
  "namespace"?: string;
  "surface"?: string;
};
};

export type GetI18nBundleResponse = {
  "data": {
  "locale": string;
  "fallbackLocale": "en";
  "namespace"?: string;
  "messages": {
  [key: string]: string;
};
};
};

export type GetInstallationStatusRequest = void;

export type GetInstallationStatusResponse = {
  "data": {
  "installed": boolean;
  "phase": "prerequisites" | "ready" | "configuration" | "content" | "verification" | "complete";
  "canInstall": boolean;
  "restartRequired": boolean;
  "dataMode"?: "empty" | "demo";
  "checks": Array<{
  "id": "database" | "transactions" | "write-access" | "runtime-keys" | "plugins" | "services" | "administrator" | "settings";
  "status": "pass" | "fail" | "blocked";
  "message": string;
}>;
  "installedAt"?: string;
  "adminUserId"?: string;
  "envFilePresent": boolean;
  "dbConfigured": boolean;
  "envFilePath": string;
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
  "executionMode": "local" | "cluster";
  "operationRevision": number;
  "version": string;
  "requiresCore": string;
  "cluster"?: {
  "desired": {
  "pluginId": string;
  "artifactVersion": string;
  "artifactChecksum": string;
  "enabled": boolean;
  "revision": number;
  "updatedBy": string;
  "reason": string;
  "updatedAt": string;
};
  "instances": Array<{
  "instanceId": string;
  "observedRevision": number;
  "state": "loaded" | "disabled" | "failed";
  "reason"?: string;
  "healthy": boolean;
  "artifactVersion": string;
  "artifactChecksum": string;
}>;
};
  "state": "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
  "source"?: {
  "type": "workspace" | "package" | "local-path";
  "name": string;
  "entrypoint": string;
  "status": "discovered" | "failed" | "disabled";
  "pluginId"?: string;
  "error"?: string;
};
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

export type GetMediaAssetRequest = {
  path: {
  "id": string;
};
};

export type GetMediaAssetResponse = {
  "data": {
  "id": string;
  "directoryId"?: string;
  "ownerUserId": string;
  "uploadedByUserId": string;
  "displayName": string;
  "originalFilename": string;
  "mimeType": string;
  "byteSize": number;
  "checksum": {
  "algorithm": "sha256";
  "value": string;
};
  "width"?: number;
  "height"?: number;
  "durationMs"?: number;
  "providerId": string;
  "storageKey": string;
  "status": "uploading" | "processing" | "ready" | "rejected" | "quarantined" | "deleted";
  "visibility": "private" | "restricted" | "public";
  "aclVersion": number;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type GetMediaProviderHealthRequest = void;

export type GetMediaProviderHealthResponse = {
  "data": Array<{
  "id": string;
  "kind": "local-disk" | "s3-compatible" | "custom";
  "selected": boolean;
  "status": "ok" | "degraded" | "down";
}>;
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type GetMfaStatusRequest = void;

export type GetMfaStatusResponse = {
  "data": {
  "mode": "disabled" | "optional" | "required";
  "enabled": boolean;
  "enabledAt"?: string;
  "recoveryCodesRemaining": number;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
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

export type GetPluginGrantRequest = {
  path: {
  "id": string;
};
};

export type GetPluginGrantResponse = {
  "data": {
  "id": string;
  "accessType": "api";
  "producerPluginId": string;
  "consumerPluginId": string;
  "target": string;
  "resource"?: string;
  "action"?: string;
  "operation"?: string;
  "payloadType": string;
  "workspaceId": string;
  "requiredPermission": string;
  "status": "pending" | "approved" | "denied" | "revoked";
  "revision": number;
  "reason"?: string;
  "approvedBy"?: string;
  "approvedAt"?: string;
  "revokedAt"?: string;
  "updatedAt": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type GetPluginOperationRequest = {
  path: {
  "operationId": string;
};
};

export type GetPluginOperationResponse = {
  "data": {
  "operationId": string;
  "pluginId": string;
  "operation": "load" | "unload" | "reload" | "disable" | "enable";
  "desiredRevision": number;
  "status": "pending" | "succeeded" | "failed" | "partial";
  "submittedAt": string;
  "expiresAt": string;
  "participants": Array<string>;
  "instances": Array<{
  "instanceId": string;
  "observedRevision": number;
  "state": "loaded" | "disabled" | "failed";
  "reason"?: string;
  "healthy": boolean;
  "artifactVersion": string;
  "artifactChecksum": string;
}>;
};
  "meta"?: {
  "pluginId"?: "kernel";
  "count"?: number;
};
};

export type GetPreviewEntryRequest = {
  path: {
  "id": string;
};
};

export type GetPreviewEntryResponse = {
  "data": {
  "id": string;
  "contentTypeKey": string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
};
};

export type GetPublicMediaContentRequest = {
  path: {
  "id": string;
};
};

export type GetPublicMediaContentResponse = Uint8Array;

export type GetPublicNavigationRequest = void;

export type GetPublicNavigationResponse = {
  "data": Array<{
  "label": string;
  "href": string;
}>;
};

export type GetPublishedEntryRequest = {
  path: {
  "key": string;
  "slug": string;
};
};

export type GetPublishedEntryResponse = {
  "data": {
  "id": string;
  "contentTypeKey": string;
  "publicationVersion": number;
  "deliveryConfigVersion": number;
  "publishedAt": string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
};
  "meta"?: {
  [key: string]: unknown;
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
  "policyRules"?: Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
}>;
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

export type GetSecureEmailJobRequest = {
  path: {
  "jobId": string;
};
};

export type GetSecureEmailJobResponse = {
  "data": {
  "id": string;
  "eventId": string;
  "ownerPluginId": string;
  "consumerPluginId": "email-pack";
  "expiresAt": string;
  "status": "pending" | "running" | "retry" | "succeeded" | "blocked" | "ambiguous" | "cancelled";
  "attempt": number;
  "epoch": number;
  "createdAt": string;
  "availableAt": string;
  "leaseOwner"?: string;
  "leaseUntil"?: string;
  "reason"?: string;
  "purgeAt"?: string;
};
  "meta"?: {
  [key: string]: unknown;
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
  "visibility"?: "public" | "admin" | "internal";
  "mutable"?: boolean;
  "secret"?: boolean;
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

export type GetSettingsGroupByIdRequest = {
  path: {
  "groupId": string;
};
};

export type GetSettingsGroupByIdResponse = {
  "data": {
  "id": string;
  "label": string;
  "ownerPluginIds": Array<string>;
  "values": {
  [key: string]: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
};
  "fields": Array<{
  "fieldId": string;
  "key": string;
  "ownerPluginId": string;
  "domain": string;
  "name": string;
  "definition": {
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
  "visibility"?: "public" | "admin" | "internal";
  "mutable"?: boolean;
  "secret"?: boolean;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
};
  "value"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "source"?: "value" | "default";
  "version"?: number;
  "updatedAt"?: string;
  "secretMetadata"?: {
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
}>;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type GetSettingsObservabilityRequest = void;

export type GetSettingsObservabilityResponse = {
  "data": {
  "reads": number;
  "writes": number;
  "denies": number;
  "errors": number;
  "pluginAuth": {
  "successes": number;
  "failures": number;
  "replays": number;
};
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
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
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

export type InviteUserRequest = {
  path: {
  "id": string;
};
};

export type InviteUserResponse = {
  "data": {
  "accepted": true;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type ListAdminExtensionsRequest = void;

export type ListAdminExtensionsResponse = {
  "data": Array<{
  "pluginId": string;
  "displayName": string;
  "admin": {
  "navigation"?: Array<Record<string, unknown>>;
  "routes"?: Array<Record<string, unknown>>;
  "resources"?: Array<Record<string, unknown>>;
  "widgets"?: Array<Record<string, unknown>>;
  "settingsSections"?: Array<Record<string, unknown>>;
};
}>;
  "meta"?: {
  "pluginId"?: "kernel";
  "count"?: number;
};
};

export type ListDeletedEditorialContentTypesRequest = {
  query?: {
  "limit"?: number;
  "offset"?: number;
};
};

export type ListDeletedEditorialContentTypesResponse = {
  "data": Array<{
  "id": string;
  "key": string;
  "name": string;
  "description"?: string;
  "icon"?: string;
  "status": "active" | "archived";
  "fields": Array<{
  "key": string;
  "label": string;
  "type": "text" | "rich_text" | "number" | "boolean" | "date_time" | "select" | "url" | "media" | "relation" | "json" | "repeatable";
  "required": boolean;
  "multiple": boolean;
  "helpText"?: string;
  "config"?: {
  "options"?: Array<string>;
  "targetContentTypeId"?: string;
  "allowedMimeTypes"?: Array<string>;
};
}>;
  "taxonomyIds": Array<string>;
  "workflowId"?: string;
  "workflow"?: {
  "preset": "review" | "direct" | "custom";
  "name"?: string;
  "states": Array<{
  "key": string;
  "label": string;
  "initial": boolean;
}>;
  "transitions": Array<{
  "key": string;
  "label": string;
  "from": string;
  "to": string;
  "requiredPermission"?: "submit" | "review" | "approve" | "publish";
}>;
};
  "showInMainNavigation"?: boolean;
  "ownershipScope": "inherit" | "own_entries" | "all_entries";
  "version": number;
  "delivery"?: {
  "enabled": boolean;
  "publicFields": Array<string>;
  "exposeTitle": boolean;
  "exposeBody": boolean;
  "exposeSlug": boolean;
};
  "deliveryConfigVersion"?: number;
  "createdByUserId": string;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
}>;
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type ListEditorialContentTypesRequest = {
  query?: {
  "limit"?: number;
  "offset"?: number;
  "status"?: "active" | "archived";
};
};

export type ListEditorialContentTypesResponse = {
  "data": Array<{
  "id": string;
  "key": string;
  "name": string;
  "description"?: string;
  "icon"?: string;
  "status": "active" | "archived";
  "fields": Array<{
  "key": string;
  "label": string;
  "type": "text" | "rich_text" | "number" | "boolean" | "date_time" | "select" | "url" | "media" | "relation" | "json" | "repeatable";
  "required": boolean;
  "multiple": boolean;
  "helpText"?: string;
  "config"?: {
  "options"?: Array<string>;
  "targetContentTypeId"?: string;
  "allowedMimeTypes"?: Array<string>;
};
}>;
  "taxonomyIds": Array<string>;
  "workflowId"?: string;
  "workflow"?: {
  "preset": "review" | "direct" | "custom";
  "name"?: string;
  "states": Array<{
  "key": string;
  "label": string;
  "initial": boolean;
}>;
  "transitions": Array<{
  "key": string;
  "label": string;
  "from": string;
  "to": string;
  "requiredPermission"?: "submit" | "review" | "approve" | "publish";
}>;
};
  "showInMainNavigation"?: boolean;
  "ownershipScope": "inherit" | "own_entries" | "all_entries";
  "version": number;
  "delivery"?: {
  "enabled": boolean;
  "publicFields": Array<string>;
  "exposeTitle": boolean;
  "exposeBody": boolean;
  "exposeSlug": boolean;
};
  "deliveryConfigVersion"?: number;
  "createdByUserId": string;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
}>;
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type ListEditorialEntriesRequest = {
  query?: {
  "limit"?: number;
  "offset"?: number;
  "contentTypeId"?: string;
  "ownerUserId"?: string;
  "reviewerUserId"?: string;
  "status"?: string;
};
};

export type ListEditorialEntriesResponse = {
  "data": Array<{
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type ListEditorialEntryRevisionsRequest = {
  path: {
  "id": string;
};
};

export type ListEditorialEntryRevisionsResponse = {
  "data": Array<{
  "id": string;
  "entryId": string;
  "revisionNumber": number;
  "reason": string;
  "snapshotJson": string;
  "createdByUserId": string;
  "createdAt": string;
}>;
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type ListEditorialPreviewSitesRequest = void;

export type ListEditorialPreviewSitesResponse = {
  "data": Array<{
  "siteId": string;
  "origin": string;
}>;
};

export type ListEmailTemplatesRequest = {
  query?: {
  "limit"?: number;
  "offset"?: number;
};
};

export type ListEmailTemplatesResponse = {
  "data": Array<{
  "id": string;
  "key": string;
  "locale": string;
  "name": string;
  "description"?: string;
  "subject": string;
  "textBody": string;
  "htmlBody"?: string;
  "variables": Array<string>;
  "status": "active" | "draft" | "disabled";
  "source": "seed" | "custom";
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta": {
  "pluginId": string;
  "total"?: number;
  "limit"?: number;
  "offset"?: number;
  [key: string]: unknown;
};
};

export type ListEventDeliveriesRequest = {
  query?: {
  "ownerPluginId"?: string;
  "consumerPluginId"?: string;
  "eventId"?: string;
  "status"?: "pending" | "running" | "retry" | "succeeded" | "blocked" | "dead-letter" | "cancelled";
  "limit"?: number;
  "offset"?: number;
};
};

export type ListEventDeliveriesResponse = {
  "data": Array<{
  "id": string;
  "eventId": string;
  "ownerPluginId": string;
  "consumerPluginId": string;
  "handlerName": string;
  "handlerVersion": string;
  "eventName": string;
  "payloadVersion": number;
  "status": "pending" | "running" | "retry" | "succeeded" | "blocked" | "dead-letter" | "cancelled";
  "attempt": number;
  "epoch": number;
  "createdAt": string;
  "availableAt": string;
  "leaseOwner"?: string;
  "leaseUntil"?: string;
  "partitionKey"?: string;
  "sequence"?: number;
  "reason"?: string;
  "completedAt"?: string;
  "purgeAt"?: string;
}>;
  "meta"?: {
  [key: string]: unknown;
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
  "executionMode": "local" | "cluster";
  "operationRevision": number;
  "version": string;
  "requiresCore": string;
  "cluster"?: {
  "desired": {
  "pluginId": string;
  "artifactVersion": string;
  "artifactChecksum": string;
  "enabled": boolean;
  "revision": number;
  "updatedBy": string;
  "reason": string;
  "updatedAt": string;
};
  "instances": Array<{
  "instanceId": string;
  "observedRevision": number;
  "state": "loaded" | "disabled" | "failed";
  "reason"?: string;
  "healthy": boolean;
  "artifactVersion": string;
  "artifactChecksum": string;
}>;
};
  "state": "registered" | "loading" | "initializing" | "loaded" | "unloading" | "failed" | "disabled" | "unloaded";
  "source"?: {
  "type": "workspace" | "package" | "local-path";
  "name": string;
  "entrypoint": string;
  "status": "discovered" | "failed" | "disabled";
  "pluginId"?: string;
  "error"?: string;
};
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

export type ListMediaAssetsRequest = {
  query?: {
  "directoryId"?: string;
  "rootOnly"?: boolean;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListMediaAssetsResponse = {
  "data": Array<{
  "id": string;
  "directoryId"?: string;
  "ownerUserId": string;
  "uploadedByUserId": string;
  "displayName": string;
  "originalFilename": string;
  "mimeType": string;
  "byteSize": number;
  "checksum": {
  "algorithm": "sha256";
  "value": string;
};
  "width"?: number;
  "height"?: number;
  "durationMs"?: number;
  "providerId": string;
  "storageKey": string;
  "status": "uploading" | "processing" | "ready" | "rejected" | "quarantined" | "deleted";
  "visibility": "private" | "restricted" | "public";
  "aclVersion": number;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
}>;
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListMediaAssetSharesRequest = {
  path: {
  "id": string;
};
};

export type ListMediaAssetSharesResponse = {
  "data": Array<{
  "id": string;
  "targetType": "asset" | "directory";
  "targetId": string;
  "principalType": "user" | "role" | "plugin";
  "principalId": string;
  "actions": Array<"read" | "write" | "manage" | "share">;
  "createdByUserId": string;
  "expiresAt"?: string;
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListMediaDirectoriesRequest = {
  query?: {
  "parentId"?: string;
};
};

export type ListMediaDirectoriesResponse = {
  "data": Array<{
  "id": string;
  "parentId"?: string;
  "name": string;
  "ownerUserId": string;
  "visibility": "private" | "restricted" | "public";
  "inheritAcl": boolean;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
}>;
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListMediaDirectorySharesRequest = {
  path: {
  "id": string;
};
};

export type ListMediaDirectorySharesResponse = {
  "data": Array<{
  "id": string;
  "targetType": "asset" | "directory";
  "targetId": string;
  "principalType": "user" | "role" | "plugin";
  "principalId": string;
  "actions": Array<"read" | "write" | "manage" | "share">;
  "createdByUserId": string;
  "expiresAt"?: string;
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListPermissionsRequest = {
  query?: {
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
  query?: {
  "limit"?: number;
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

export type ListPluginGrantsRequest = {
  query?: {
  "limit"?: number;
  "offset"?: number;
};
};

export type ListPluginGrantsResponse = {
  "data": Array<{
  "id": string;
  "accessType": "api";
  "producerPluginId": string;
  "consumerPluginId": string;
  "target": string;
  "resource"?: string;
  "action"?: string;
  "operation"?: string;
  "payloadType": string;
  "workspaceId": string;
  "requiredPermission": string;
  "status": "pending" | "approved" | "denied" | "revoked";
  "revision": number;
  "reason"?: string;
  "approvedBy"?: string;
  "approvedAt"?: string;
  "revokedAt"?: string;
  "updatedAt": string;
}>;
  "meta"?: {
  [key: string]: unknown;
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

export type ListPublishedEntriesRequest = {
  path: {
  "key": string;
};
  query?: {
  "limit"?: number;
  "offset"?: number;
};
};

export type ListPublishedEntriesResponse = {
  "data": Array<{
  "id": string;
  "contentTypeKey": string;
  "publicationVersion": number;
  "deliveryConfigVersion": number;
  "publishedAt": string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
}>;
  "meta"?: {
  [key: string]: unknown;
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
  query?: {
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
  "policyRules"?: Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
}>;
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

export type ListSecureEmailJobsRequest = {
  query?: {
  "ownerPluginId"?: string;
  "eventId"?: string;
  "status"?: "pending" | "running" | "retry" | "succeeded" | "blocked" | "ambiguous" | "cancelled";
  "limit"?: number;
  "offset"?: number;
};
};

export type ListSecureEmailJobsResponse = {
  "data": Array<{
  "id": string;
  "eventId": string;
  "ownerPluginId": string;
  "consumerPluginId": "email-pack";
  "expiresAt": string;
  "status": "pending" | "running" | "retry" | "succeeded" | "blocked" | "ambiguous" | "cancelled";
  "attempt": number;
  "epoch": number;
  "createdAt": string;
  "availableAt": string;
  "leaseOwner"?: string;
  "leaseUntil"?: string;
  "reason"?: string;
  "purgeAt"?: string;
}>;
  "meta"?: {
  [key: string]: unknown;
};
};

export type ListSecurityAuditRequest = {
  query?: {
  "ownerPluginId"?: string;
  "actorId"?: string;
  "since"?: string;
  "until"?: string;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListSecurityAuditResponse = {
  "data": Array<{
  "id": string;
  "timestamp": string;
  "instanceId": string;
  "actorKind": "user" | "plugin" | "system";
  "actorId": string;
  "ownerPluginId": string;
  "action": string;
  "resourceId": string;
  "outcome": "allowed" | "denied" | "failed";
  "reason": string;
  "correlationId"?: string;
  "revision"?: number;
  "epoch"?: number;
}>;
  "meta"?: {
  [key: string]: unknown;
};
};

export type ListSettingDefinitionsRequest = {
  query?: {
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
  "visibility"?: "public" | "admin" | "internal";
  "mutable"?: boolean;
  "secret"?: boolean;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  [key: string]: unknown;
};
};

export type ListSettingsGroupsRequest = {
  query?: {
  "ownerPluginId"?: string;
  "limit"?: number;
  "offset"?: number;
};
};

export type ListSettingsGroupsResponse = {
  "data": Array<{
  "id": string;
  "label": string;
  "ownerPluginIds": Array<string>;
  "definitionCount": number;
  "editableCount": number;
  "secretCount": number;
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
  query?: {
  "limit"?: number;
  "offset"?: number;
};
};

export type ListUsersResponse = {
  "data": Array<{
  "id": string;
  "email": string;
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
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
  "tokenType": "Bearer";
  "expiresAt": string;
  "refreshExpiresAt": string;
  "user": {
  "id": string;
  "email": string;
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
} | {
  "status": "mfa_required" | "mfa_enrollment_required";
  "challengeId": string;
  "expiresAt": string;
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

export type PermanentlyDeleteEditorialContentTypeRequest = {
  path: {
  "id": string;
};
};

export type PermanentlyDeleteEditorialContentTypeResponse = {
  "data": {
  "id": string;
  "permanentlyDeleted": boolean;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type PreviewEmailTemplateRequest = {
  body: {
  "key": string;
  "locale"?: string;
  "variables": {
  [key: string]: string | number | boolean;
};
};
};

export type PreviewEmailTemplateResponse = {
  "data": {
  "templateKey": string;
  "locale": string;
  "subject": string;
  "text": string;
  "html"?: string;
};
  "meta": {
  "pluginId": string;
  [key: string]: unknown;
};
};

export type PublishEditorialEntryRequest = {
  path: {
  "id": string;
};
};

export type PublishEditorialEntryResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type PublishEditorialEntrySnapshotRequest = {
  path: {
  "id": string;
};
  body: {
  "expectedVersion": number;
};
};

export type PublishEditorialEntrySnapshotResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type ReceiveMediaUploadContentRequest = {
  path: {
  "id": string;
};
  body: Uint8Array;
};

export type ReceiveMediaUploadContentResponse = {
  "data": {
  "id": string;
  "ownerUserId": string;
  "providerId": string;
  "storageKey": string;
  "replacementAssetId"?: string;
  "directoryId"?: string;
  "displayName": string;
  "originalFilename": string;
  "mimeType": string;
  "expectedByteSize": number;
  "expectedChecksumSha256"?: string;
  "status": "pending" | "content_received" | "completed" | "rejected" | "expired";
  "expiresAt": string;
  "assetId"?: string;
  "rejectionReason"?: string;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type RegisterPublicUserRequest = {
  body: {
  "email": string;
  "firstName": string;
  "lastName": string;
  "password": string;
};
};

export type RegisterPublicUserResponse = {
  "data": {
  "accepted": true;
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

export type ReplaceMediaAssetSharesRequest = {
  path: {
  "id": string;
};
  body: {
  "grants": ReadonlyArray<{
  "principalType": "user" | "role" | "plugin";
  "principalId": string;
  "actions": ReadonlyArray<"read" | "write" | "manage" | "share">;
  "expiresAt"?: string;
}>;
};
};

export type ReplaceMediaAssetSharesResponse = {
  "data": Array<{
  "id": string;
  "targetType": "asset" | "directory";
  "targetId": string;
  "principalType": "user" | "role" | "plugin";
  "principalId": string;
  "actions": Array<"read" | "write" | "manage" | "share">;
  "createdByUserId": string;
  "expiresAt"?: string;
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type ReplaceMediaDirectorySharesRequest = {
  path: {
  "id": string;
};
  body: {
  "grants": ReadonlyArray<{
  "principalType": "user" | "role" | "plugin";
  "principalId": string;
  "actions": ReadonlyArray<"read" | "write" | "manage" | "share">;
  "expiresAt"?: string;
}>;
};
};

export type ReplaceMediaDirectorySharesResponse = {
  "data": Array<{
  "id": string;
  "targetType": "asset" | "directory";
  "targetId": string;
  "principalType": "user" | "role" | "plugin";
  "principalId": string;
  "actions": Array<"read" | "write" | "manage" | "share">;
  "createdByUserId": string;
  "expiresAt"?: string;
  "createdAt": string;
  "updatedAt": string;
}>;
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type RequestEditorialEntryChangesRequest = {
  path: {
  "id": string;
};
};

export type RequestEditorialEntryChangesResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type RequestEmailVerificationRequest = {
  body: {
  "email": string;
};
};

export type RequestEmailVerificationResponse = {
  "data": {
  "accepted": true;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type RequestPasswordResetRequest = {
  body: {
  "email": string;
};
};

export type RequestPasswordResetResponse = {
  "data": {
  "accepted": true;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type RestoreEditorialContentTypeRequest = {
  path: {
  "id": string;
};
};

export type RestoreEditorialContentTypeResponse = {
  "data": {
  "id": string;
  "key": string;
  "name": string;
  "description"?: string;
  "icon"?: string;
  "status": "active" | "archived";
  "fields": Array<{
  "key": string;
  "label": string;
  "type": "text" | "rich_text" | "number" | "boolean" | "date_time" | "select" | "url" | "media" | "relation" | "json" | "repeatable";
  "required": boolean;
  "multiple": boolean;
  "helpText"?: string;
  "config"?: {
  "options"?: Array<string>;
  "targetContentTypeId"?: string;
  "allowedMimeTypes"?: Array<string>;
};
}>;
  "taxonomyIds": Array<string>;
  "workflowId"?: string;
  "workflow"?: {
  "preset": "review" | "direct" | "custom";
  "name"?: string;
  "states": Array<{
  "key": string;
  "label": string;
  "initial": boolean;
}>;
  "transitions": Array<{
  "key": string;
  "label": string;
  "from": string;
  "to": string;
  "requiredPermission"?: "submit" | "review" | "approve" | "publish";
}>;
};
  "showInMainNavigation"?: boolean;
  "ownershipScope": "inherit" | "own_entries" | "all_entries";
  "version": number;
  "delivery"?: {
  "enabled": boolean;
  "publicFields": Array<string>;
  "exposeTitle": boolean;
  "exposeBody": boolean;
  "exposeSlug": boolean;
};
  "deliveryConfigVersion"?: number;
  "createdByUserId": string;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type RestoreEditorialEntryRevisionRequest = {
  path: {
  "id": string;
  "revisionId": string;
};
};

export type RestoreEditorialEntryRevisionResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type RetryEventDeliveryRequest = {
  path: {
  "deliveryId": string;
};
  body: {
  "expectedEpoch": number;
  "reason": string;
};
};

export type RetryEventDeliveryResponse = {
  "data": {
  "id": string;
  "eventId": string;
  "ownerPluginId": string;
  "consumerPluginId": string;
  "handlerName": string;
  "handlerVersion": string;
  "eventName": string;
  "payloadVersion": number;
  "status": "pending" | "running" | "retry" | "succeeded" | "blocked" | "dead-letter" | "cancelled";
  "attempt": number;
  "epoch": number;
  "createdAt": string;
  "availableAt": string;
  "leaseOwner"?: string;
  "leaseUntil"?: string;
  "partitionKey"?: string;
  "sequence"?: number;
  "reason"?: string;
  "completedAt"?: string;
  "purgeAt"?: string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type RetrySecureEmailJobRequest = {
  path: {
  "jobId": string;
};
  body: {
  "expectedEpoch": number;
  "reason": string;
};
};

export type RetrySecureEmailJobResponse = {
  "data": {
  "id": string;
  "eventId": string;
  "ownerPluginId": string;
  "consumerPluginId": "email-pack";
  "expiresAt": string;
  "status": "pending" | "running" | "retry" | "succeeded" | "blocked" | "ambiguous" | "cancelled";
  "attempt": number;
  "epoch": number;
  "createdAt": string;
  "availableAt": string;
  "leaseOwner"?: string;
  "leaseUntil"?: string;
  "reason"?: string;
  "purgeAt"?: string;
};
  "meta"?: {
  [key: string]: unknown;
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

export type RevokePluginGrantRequest = {
  path: {
  "id": string;
};
  body: {
  "expectedRevision": number;
  "reason": string;
};
};

export type RevokePluginGrantResponse = {
  "data": {
  "id": string;
  "accessType": "api";
  "producerPluginId": string;
  "consumerPluginId": string;
  "target": string;
  "resource"?: string;
  "action"?: string;
  "operation"?: string;
  "payloadType": string;
  "workspaceId": string;
  "requiredPermission": string;
  "status": "pending" | "approved" | "denied" | "revoked";
  "revision": number;
  "reason"?: string;
  "approvedBy"?: string;
  "approvedAt"?: string;
  "revokedAt"?: string;
  "updatedAt": string;
};
  "meta"?: {
  [key: string]: unknown;
};
};

export type RevokePreviewSessionRequest = void;

export type RevokePreviewSessionResponse = {
  "data": {
  "revoked": boolean;
};
};

export type StartMediaUploadRequest = {
  body: {
  "filename": string;
  "mimeType": string;
  "byteSize": number;
  "checksumSha256"?: string;
  "directoryId"?: string;
  "displayName"?: string;
  "replacementAssetId"?: string;
};
};

export type StartMediaUploadResponse = {
  "data": {
  "session": {
  "id": string;
  "ownerUserId": string;
  "providerId": string;
  "storageKey": string;
  "replacementAssetId"?: string;
  "directoryId"?: string;
  "displayName": string;
  "originalFilename": string;
  "mimeType": string;
  "expectedByteSize": number;
  "expectedChecksumSha256"?: string;
  "status": "pending" | "content_received" | "completed" | "rejected" | "expired";
  "expiresAt": string;
  "assetId"?: string;
  "rejectionReason"?: string;
  "createdAt": string;
  "updatedAt": string;
};
  "upload": {
  "method": "proxy" | "presigned";
  "uploadUrl": string;
  "expiresAt": string;
  "requiredHeaders"?: {
  [key: string]: string;
};
};
};
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type SubmitEditorialEntryRequest = {
  path: {
  "id": string;
};
};

export type SubmitEditorialEntryResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type TransitionEditorialEntryRequest = {
  path: {
  "id": string;
};
  body: {
  "transitionId": string;
};
};

export type TransitionEditorialEntryResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type UnpublishEditorialEntryRequest = {
  path: {
  "id": string;
};
};

export type UnpublishEditorialEntryResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type UpdateAuthenticatedUserProfileRequest = {
  body: {
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
};
};

export type UpdateAuthenticatedUserProfileResponse = {
  "data": {
  "id": string;
  "email": string;
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
  "status": "active" | "suspended";
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId"?: "core-pack";
};
};

export type UpdateEditorialContentTypeRequest = {
  path: {
  "id": string;
};
  body: {
  "name"?: string;
  "description"?: string;
  "clearDescription"?: boolean;
  "icon"?: string;
  "clearIcon"?: boolean;
  "status"?: "active" | "archived";
  "fields"?: ReadonlyArray<{
  "key": string;
  "label": string;
  "type": "text" | "rich_text" | "number" | "boolean" | "date_time" | "select" | "url" | "media" | "relation" | "json" | "repeatable";
  "required": boolean;
  "multiple": boolean;
  "helpText"?: string;
  "config"?: {
  "options"?: ReadonlyArray<string>;
  "targetContentTypeId"?: string;
  "allowedMimeTypes"?: ReadonlyArray<string>;
};
}>;
  "delivery"?: {
  "enabled": boolean;
  "publicFields": ReadonlyArray<string>;
  "exposeTitle": boolean;
  "exposeBody": boolean;
  "exposeSlug": boolean;
};
  "taxonomyIds"?: ReadonlyArray<string>;
  "workflowId"?: string;
  "clearWorkflow"?: boolean;
  "workflow"?: {
  "preset": "review" | "direct" | "custom";
  "name"?: string;
  "states": ReadonlyArray<{
  "key": string;
  "label": string;
  "initial": boolean;
}>;
  "transitions": ReadonlyArray<{
  "key": string;
  "label": string;
  "from": string;
  "to": string;
  "requiredPermission"?: "submit" | "review" | "approve" | "publish";
}>;
};
  "clearWorkflowDefinition"?: boolean;
  "ownershipScope"?: "inherit" | "own_entries" | "all_entries";
};
};

export type UpdateEditorialContentTypeResponse = {
  "data": {
  "id": string;
  "key": string;
  "name": string;
  "description"?: string;
  "icon"?: string;
  "status": "active" | "archived";
  "fields": Array<{
  "key": string;
  "label": string;
  "type": "text" | "rich_text" | "number" | "boolean" | "date_time" | "select" | "url" | "media" | "relation" | "json" | "repeatable";
  "required": boolean;
  "multiple": boolean;
  "helpText"?: string;
  "config"?: {
  "options"?: Array<string>;
  "targetContentTypeId"?: string;
  "allowedMimeTypes"?: Array<string>;
};
}>;
  "taxonomyIds": Array<string>;
  "workflowId"?: string;
  "workflow"?: {
  "preset": "review" | "direct" | "custom";
  "name"?: string;
  "states": Array<{
  "key": string;
  "label": string;
  "initial": boolean;
}>;
  "transitions": Array<{
  "key": string;
  "label": string;
  "from": string;
  "to": string;
  "requiredPermission"?: "submit" | "review" | "approve" | "publish";
}>;
};
  "showInMainNavigation"?: boolean;
  "ownershipScope": "inherit" | "own_entries" | "all_entries";
  "version": number;
  "delivery"?: {
  "enabled": boolean;
  "publicFields": Array<string>;
  "exposeTitle": boolean;
  "exposeBody": boolean;
  "exposeSlug": boolean;
};
  "deliveryConfigVersion"?: number;
  "createdByUserId": string;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type UpdateEditorialEntryRequest = {
  path: {
  "id": string;
};
  body: {
  "title"?: string;
  "clearTitle"?: boolean;
  "slug"?: string;
  "clearSlug"?: boolean;
  "body"?: {
  "version": 1;
  "blocks": ReadonlyArray<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": ReadonlyArray<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": ReadonlyArray<ReadonlyArray<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": ReadonlyArray<{
  "id": string;
  "blocks": ReadonlyArray<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": ReadonlyArray<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": ReadonlyArray<ReadonlyArray<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": ReadonlyArray<{
  "id": string;
  "blocks": ReadonlyArray<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": ReadonlyArray<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": ReadonlyArray<ReadonlyArray<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": ReadonlyArray<{
  "id": string;
  "blocks": ReadonlyArray<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: ReadonlyArray<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": ReadonlyArray<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": ReadonlyArray<ReadonlyArray<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "clearBody"?: boolean;
  "data"?: {
  [key: string]: unknown;
};
  "reviewerUserId"?: string;
  "clearReviewer"?: boolean;
  "scheduledAt"?: string;
  "clearScheduledAt"?: boolean;
  "expectedVersion"?: number;
};
};

export type UpdateEditorialEntryResponse = {
  "data": {
  "id": string;
  "contentTypeId": string;
  "ownerUserId": string;
  "reviewerUserId"?: string;
  "title"?: string;
  "slug"?: string;
  "body"?: {
  "version": 1;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
} | {
  "id": string;
  "type": "layout";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "columns": Array<{
  "id": string;
  "blocks": Array<{
  "id": string;
  "type": "paragraph";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
};
} | {
  "id": string;
  "type": "heading";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "level": 2 | 3 | 4;
};
} | {
  "id": string;
  "type": "quote";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "text": string;
  "inline"?: Array<{
  "text": string;
  "bold"?: boolean;
  "italic"?: boolean;
  "code"?: boolean;
  "link"?: {
  "href": string;
  "entryId"?: string;
};
}>;
  "citation"?: string;
};
} | {
  "id": string;
  "type": "image";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "src": string;
  "alt": string;
  "assetId"?: string;
  "caption"?: string;
};
} | {
  "id": string;
  "type": "list";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "style": "bulleted" | "numbered";
  "items": Array<string>;
};
} | {
  "id": string;
  "type": "table";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": {
  "hasHeader": boolean;
  "rows": Array<Array<string>>;
};
} | {
  "id": string;
  "type": "divider";
  "version": 1;
  "appearance"?: {
  "textColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
  "backgroundColor"?: "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
};
  "data": Record<string, never>;
}>;
}>;
};
}>;
}>;
};
}>;
}>;
};
}>;
} | {
  "text": string;
};
  "data": {
  [key: string]: unknown;
};
  "status": string;
  "scheduledAt"?: string;
  "publishedAt"?: string;
  "version"?: number;
  "createdAt": string;
  "updatedAt": string;
};
  "meta"?: {
  "pluginId": string;
  "count"?: number;
};
};

export type UpdateMediaAssetRequest = {
  path: {
  "id": string;
};
  body: {
  "displayName"?: string;
  "directoryId"?: string;
  "clearDirectory"?: boolean;
  "visibility"?: "private" | "restricted" | "public";
};
};

export type UpdateMediaAssetResponse = {
  "data": {
  "id": string;
  "directoryId"?: string;
  "ownerUserId": string;
  "uploadedByUserId": string;
  "displayName": string;
  "originalFilename": string;
  "mimeType": string;
  "byteSize": number;
  "checksum": {
  "algorithm": "sha256";
  "value": string;
};
  "width"?: number;
  "height"?: number;
  "durationMs"?: number;
  "providerId": string;
  "storageKey": string;
  "status": "uploading" | "processing" | "ready" | "rejected" | "quarantined" | "deleted";
  "visibility": "private" | "restricted" | "public";
  "aclVersion": number;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type UpdateMediaDirectoryRequest = {
  path: {
  "id": string;
};
  body: {
  "name"?: string;
  "parentId"?: string;
  "clearParent"?: boolean;
  "visibility"?: "private" | "restricted" | "public";
  "inheritAcl"?: boolean;
};
};

export type UpdateMediaDirectoryResponse = {
  "data": {
  "id": string;
  "parentId"?: string;
  "name": string;
  "ownerUserId": string;
  "visibility": "private" | "restricted" | "public";
  "inheritAcl": boolean;
  "createdAt": string;
  "updatedAt": string;
  "deletedAt"?: string;
};
  "meta"?: {
  "pluginId"?: "media-pack";
  "count"?: number;
  "limit"?: number;
  "offset"?: number;
};
};

export type UpdatePermissionRequest = {
  path: {
  "id": string;
};
  body: {
  "displayName": string;
  "description"?: string;
  "status"?: "active" | "disabled";
};
};

export type UpdatePermissionResponse = {
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

export type UpdateRoleRequest = {
  path: {
  "id": string;
};
  body: {
  "name": string;
  "description"?: string;
  "status"?: "active" | "disabled";
  "permissions"?: ReadonlyArray<string>;
};
};

export type UpdateRoleResponse = {
  "data": {
  "id": string;
  "code": string;
  "name": string;
  "description"?: string;
  "ownerPluginId"?: string;
  "permissions"?: Array<string>;
  "policyRules"?: Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
}>;
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
  "conditions"?: ReadonlyArray<"resource_id_required" | "resource_id_equals_subject">;
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
  "policyRules"?: Array<{
  "effect": "allow" | "deny";
  "permissionPattern": string;
  "conditions": Array<"resource_id_required" | "resource_id_equals_subject">;
  "sourcePluginId": string;
  "createdAt": string;
  "updatedAt": string;
}>;
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

export type UpdateUserProfileRequest = {
  path: {
  "id": string;
};
  body: {
  "firstName": string;
  "lastName": string;
  "status"?: "active" | "suspended";
};
};

export type UpdateUserProfileResponse = {
  "data": {
  "id": string;
  "email": string;
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
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
  "firstName": string;
  "lastName": string;
  "locale"?: "en" | "it";
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

export type UpsertEmailTemplateRequest = {
  body: {
  "key": string;
  "locale": string;
  "name": string;
  "description"?: string;
  "subject": string;
  "textBody": string;
  "htmlBody"?: string;
  "variables": ReadonlyArray<string>;
  "status"?: "active" | "disabled";
};
};

export type UpsertEmailTemplateResponse = {
  "data": {
  "id": string;
  "key": string;
  "locale": string;
  "name": string;
  "description"?: string;
  "subject": string;
  "textBody": string;
  "htmlBody"?: string;
  "variables": Array<string>;
  "status": "active" | "draft" | "disabled";
  "source": "seed" | "custom";
  "createdAt": string;
  "updatedAt": string;
};
  "meta": {
  "pluginId": string;
  [key: string]: unknown;
};
};

export type UpsertSettingDefinitionRequest = {
  body: {
  "key": string;
  "category"?: string;
  "description"?: string;
  "status"?: "active" | "disabled";
  "visibility"?: "public" | "admin" | "internal";
  "mutable"?: boolean;
  "secret"?: boolean;
  "schema"?: string | number | boolean | null | ReadonlyArray<unknown> | {
  [key: string]: unknown;
};
  "defaultValue"?: string | number | boolean | null | ReadonlyArray<unknown> | {
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
  "visibility"?: "public" | "admin" | "internal";
  "mutable"?: boolean;
  "secret"?: boolean;
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

export type UpsertSettingsGroupValuesRequest = {
  path: {
  "groupId": string;
};
  body: {
  "values": {
  [key: string]: string | number | boolean | null | ReadonlyArray<unknown> | {
  [key: string]: unknown;
};
};
  "updatedBy"?: string;
};
};

export type UpsertSettingsGroupValuesResponse = {
  "data": {
  "group": {
  "id": string;
  "label": string;
  "ownerPluginIds": Array<string>;
  "values": {
  [key: string]: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
};
  "fields": Array<{
  "fieldId": string;
  "key": string;
  "ownerPluginId": string;
  "domain": string;
  "name": string;
  "definition": {
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
  "visibility"?: "public" | "admin" | "internal";
  "mutable"?: boolean;
  "secret"?: boolean;
  "status": "active" | "disabled";
  "createdAt": string;
  "updatedAt": string;
};
  "value"?: string | number | boolean | null | Array<unknown> | {
  [key: string]: unknown;
};
  "source"?: "value" | "default";
  "version"?: number;
  "updatedAt"?: string;
  "secretMetadata"?: {
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
}>;
};
  "updated": Array<{
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
  "value": string | number | boolean | null | ReadonlyArray<unknown> | {
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
