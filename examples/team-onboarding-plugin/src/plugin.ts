import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { TEAM_ONBOARDING_MANIFEST } from "./plugin.manifest.js";

/**
 * Runtime definition intentionally keeps business storage out of the template.
 * Replace the console audit with a module/service once the copied plugin owns a
 * real onboarding domain entity.
 */
export function createTeamOnboardingPlugin(): KernelPluginDefinition {
  return {
    manifest: TEAM_ONBOARDING_MANIFEST,
    onLoad(context) {
      console.info(`[${context.pluginId}] loaded: team onboarding reference plugin`);
    },
    onUnload(context) {
      console.info(`[${context.pluginId}] unloaded`);
    },
    eventHandlers: {
      recordCorePackInvite(payload) {
        const userId = readUserId(payload);
        console.info(`[team-onboarding] invite observed for user ${userId}`);
      }
    }
  };
}

export const TEAM_ONBOARDING_PLUGIN = createTeamOnboardingPlugin();

function readUserId(payload: unknown): string {
  if (!payload || typeof payload !== "object" || !("userId" in payload)) {
    throw new Error("core-pack:user-invited payload must include userId");
  }
  const userId = (payload as { userId?: unknown }).userId;
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("core-pack:user-invited payload must include a non-empty userId");
  }
  return userId.trim();
}
