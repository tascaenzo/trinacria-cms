import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { EmailPackModule } from "../modules/email/email.module.js";
import { EMAIL_PACK_MANIFEST } from "./email-pack.manifest.js";
export function createEmailPackPlugin(): KernelPluginDefinition {
  return {
    manifest: EMAIL_PACK_MANIFEST,
    modules: [EmailPackModule],
    async onLoad(context) {
      await context.services.operations.call("email-pack", "initialize", {});
    },
    eventHandlers: {
      async deliverEmailRequest(payload, _envelope, context) {
        if (!context.secureJobs)
          throw new Error("Email handler requires the durable secure job host");
        const notification =
          payload as import("@trinacria-cms/kernel/contracts").SecureEventPayloadReadyEvent;
        await context.secureJobs.enqueueFromPayload({
          payloadId: notification.securePayloadId,
          eventName: context.eventName,
          payloadType: notification.payloadType,
          schemaVersion: notification.schemaVersion,
          requiredPermission: "email-pack:email:send"
        });
      }
    }
  };
}
