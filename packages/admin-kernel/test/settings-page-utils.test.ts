import assert from "node:assert/strict";
import test from "node:test";
import {
  filterRecordsForSettingsSection,
  getSettingEnumOptions,
  getSettingValueKind,
  groupSettingRecordsForForm,
  parseSettingFormValue,
  toEditableSettingInput,
  type SettingDefinitionRecord
} from "../src/pages/settings/settings-page.utils.js";
import type { RenderableAdminSettingsSection } from "../src/runtime/admin-route-runtime.js";

function setting(input: Partial<SettingDefinitionRecord> & { key: string }): SettingDefinitionRecord {
  return {
    category: "general",
    defaultValue: null,
    description: "",
    key: input.key,
    mutable: true,
    ownerPluginId: "core-pack",
    schema: undefined,
    secret: false,
    status: "active",
    visibility: "admin",
    ...input
  } as SettingDefinitionRecord;
}

test("filterRecordsForSettingsSection supports explicit keys and category fallback", () => {
  const records = [
    setting({ key: "core-pack:site:name", category: "site" }),
    setting({ key: "core-pack:cache:redis_url", category: "cache" })
  ];

  const explicitSection = {
    id: "general",
    pluginId: "core-pack",
    settingKeys: ["core-pack:site:name"]
  } as RenderableAdminSettingsSection;
  const categorySection = {
    id: "cache",
    pluginId: "core-pack",
    category: "cache"
  } as RenderableAdminSettingsSection;

  assert.deepEqual(filterRecordsForSettingsSection(records, explicitSection), [records[0]]);
  assert.deepEqual(filterRecordsForSettingsSection(records, categorySection), [records[1]]);
});

test("groupSettingRecordsForForm assigns readable groups from category and keys", () => {
  const groups = groupSettingRecordsForForm([
    setting({ key: "core-pack:site:name", category: "site" }),
    setting({ key: "core-pack:auth:login_max_attempts", category: "auth" }),
    setting({ key: "core-pack:cache:redis_retry_delay", category: "cache" })
  ]);

  assert.deepEqual(
    groups.map((group) => group.title),
    ["Site details", "Login protection", "Redis retry policy"]
  );
});

test("settings value helpers infer and parse typed form values", () => {
  const numberSetting = setting({
    key: "core-pack:login:max_attempts",
    schema: { type: "integer" }
  });
  const booleanSetting = setting({
    key: "core-pack:security:strict",
    schema: { type: "boolean" }
  });
  const jsonSetting = setting({
    key: "core-pack:cache:options",
    schema: { type: "object" }
  });

  assert.equal(getSettingValueKind(numberSetting), "number");
  assert.equal(parseSettingFormValue(numberSetting, "5"), 5);
  assert.equal(parseSettingFormValue(booleanSetting, "true"), true);
  assert.deepEqual(parseSettingFormValue(jsonSetting, "{\"ttl\":60}"), { ttl: 60 });
  assert.equal(toEditableSettingInput({ ttl: 60 }), JSON.stringify({ ttl: 60 }, null, 2));
});

test("getSettingEnumOptions normalizes primitive enum values", () => {
  assert.deepEqual(getSettingEnumOptions({ enum: ["a", 2, true, null] }), ["a", "2", "true"]);
});
