import type { EventBus } from "@trinacria/events";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import type { UserRecord } from "./users.schemas.js";

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

export async function publishCorePackUserEvent<TPayload>(
  events: EventBus | undefined,
  eventName: string,
  payload: TPayload
): Promise<void> {
  if (!events) return;
  await events.emit(eventName, payload);
}
