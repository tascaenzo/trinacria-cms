import type { PluginManifestEmittedEvent } from "@trinacria-cms/kernel/contracts";
import { defineEmittedEvent } from "@trinacria-cms/kernel/plugin-api";
import { CORE_PACK_PLUGIN_ID } from "../../../plugin/core-pack.constants.js";
import type { UserRecord } from "../users.schemas.js";

export const CORE_PACK_USER_CREATED_EVENT = `${CORE_PACK_PLUGIN_ID}:user-created`;
export const CORE_PACK_USER_PROFILE_UPDATED_EVENT = `${CORE_PACK_PLUGIN_ID}:user-profile-updated`;
export const CORE_PACK_USER_STATUS_CHANGED_EVENT = `${CORE_PACK_PLUGIN_ID}:user-status-changed`;
export const CORE_PACK_USER_INVITED_EVENT = `${CORE_PACK_PLUGIN_ID}:user-invited`;
export const CORE_PACK_USER_INVITE_ACCEPTED_EVENT = `${CORE_PACK_PLUGIN_ID}:user-invite-accepted`;

export type CorePackUserEventSource = "admin" | "public-registration" | "system";

export interface CorePackUserCreatedPayload {
  userId: string;
  status: UserRecord["status"];
  source: CorePackUserEventSource;
}

export interface CorePackUserProfileUpdatedPayload {
  userId: string;
  changedFields: readonly ("firstName" | "lastName")[];
}

export interface CorePackUserStatusChangedPayload {
  userId: string;
  previousStatus: UserRecord["status"];
  status: UserRecord["status"];
  reason?: "admin" | "email-verification" | "invite-accepted" | "system";
}

export interface CorePackUserInvitedPayload {
  userId: string;
  actorUserId?: string;
}

export interface CorePackUserInviteAcceptedPayload {
  userId: string;
}

export const CORE_PACK_USER_EVENT_DEFINITIONS: readonly PluginManifestEmittedEvent[] = [
  defineEmittedEvent({
    name: "user-created",
    visibility: "public",
    version: 1,
    delivery: "async",
    payloadSchema: {
      type: "object",
      required: ["userId", "status", "source"],
      additionalProperties: false,
      properties: {
        userId: { type: "string" },
        status: { type: "string", enum: ["active", "suspended"] },
        source: { type: "string", enum: ["admin", "public-registration", "system"] }
      }
    }
  }),
  defineEmittedEvent({
    name: "user-profile-updated",
    visibility: "public",
    version: 1,
    delivery: "async",
    payloadSchema: {
      type: "object",
      required: ["userId", "changedFields"],
      additionalProperties: false,
      properties: {
        userId: { type: "string" },
        changedFields: {
          type: "array",
          items: { type: "string", enum: ["firstName", "lastName"] }
        }
      }
    }
  }),
  defineEmittedEvent({
    name: "user-status-changed",
    visibility: "public",
    version: 1,
    delivery: "async",
    payloadSchema: {
      type: "object",
      required: ["userId", "previousStatus", "status"],
      additionalProperties: false,
      properties: {
        userId: { type: "string" },
        previousStatus: { type: "string", enum: ["active", "suspended"] },
        status: { type: "string", enum: ["active", "suspended"] },
        reason: {
          type: "string",
          enum: ["admin", "email-verification", "invite-accepted", "system"]
        }
      }
    }
  }),
  defineEmittedEvent({
    name: "user-invited",
    visibility: "public",
    version: 1,
    delivery: "async",
    payloadSchema: {
      type: "object",
      required: ["userId"],
      additionalProperties: false,
      properties: {
        userId: { type: "string" },
        actorUserId: { type: "string" }
      }
    }
  }),
  defineEmittedEvent({
    name: "user-invite-accepted",
    visibility: "public",
    version: 1,
    delivery: "async",
    payloadSchema: {
      type: "object",
      required: ["userId"],
      additionalProperties: false,
      properties: {
        userId: { type: "string" }
      }
    }
  })
] as const;
