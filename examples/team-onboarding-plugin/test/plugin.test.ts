import assert from "node:assert/strict";
import test from "node:test";
import { validatePluginManifest } from "@trinacria-cms/kernel";
import {
  TEAM_ONBOARDING_MANIFEST,
  TEAM_ONBOARDING_PLUGIN,
  TEAM_ONBOARDING_PLUGIN_ID
} from "../src/index.js";

test("team onboarding reference plugin is a valid loadable definition", () => {
  const manifest = validatePluginManifest(TEAM_ONBOARDING_MANIFEST);

  assert.equal(manifest.id, TEAM_ONBOARDING_PLUGIN_ID);
  assert.equal(manifest.dependencies?.[0]?.pluginId, "core-pack");
  assert.equal(manifest.settings?.length, 2);
  assert.equal(manifest.events?.subscribes?.[0]?.eventName, "core-pack:user-invited");
  assert.equal(manifest.admin?.settingsSections?.[0]?.id, "team-onboarding-settings");
  assert.equal(typeof TEAM_ONBOARDING_PLUGIN.eventHandlers?.recordCorePackInvite, "function");
});
