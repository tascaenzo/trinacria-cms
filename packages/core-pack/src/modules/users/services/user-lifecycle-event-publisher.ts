import type { EventBus } from "@trinacria/events";
import {
  CORE_PACK_USER_CREATED_EVENT,
  CORE_PACK_USER_INVITE_ACCEPTED_EVENT,
  CORE_PACK_USER_INVITED_EVENT,
  CORE_PACK_USER_PROFILE_UPDATED_EVENT,
  CORE_PACK_USER_STATUS_CHANGED_EVENT,
  type CorePackUserCreatedPayload,
  type CorePackUserInviteAcceptedPayload,
  type CorePackUserInvitedPayload,
  type CorePackUserProfileUpdatedPayload,
  type CorePackUserStatusChangedPayload
} from "../events/user-events.catalog.js";

export class UserLifecycleEventPublisher {
  constructor(private readonly events?: EventBus) {}

  userCreated(payload: CorePackUserCreatedPayload): Promise<void> {
    return this.emit(CORE_PACK_USER_CREATED_EVENT, payload);
  }

  userProfileUpdated(payload: CorePackUserProfileUpdatedPayload): Promise<void> {
    return this.emit(CORE_PACK_USER_PROFILE_UPDATED_EVENT, payload);
  }

  userStatusChanged(payload: CorePackUserStatusChangedPayload): Promise<void> {
    return this.emit(CORE_PACK_USER_STATUS_CHANGED_EVENT, payload);
  }

  userInvited(payload: CorePackUserInvitedPayload): Promise<void> {
    return this.emit(CORE_PACK_USER_INVITED_EVENT, payload);
  }

  userInviteAccepted(payload: CorePackUserInviteAcceptedPayload): Promise<void> {
    return this.emit(CORE_PACK_USER_INVITE_ACCEPTED_EVENT, payload);
  }

  private async emit<TPayload>(eventName: string, payload: TPayload): Promise<void> {
    if (!this.events) return;
    await this.events.emit(eventName, payload);
  }
}
