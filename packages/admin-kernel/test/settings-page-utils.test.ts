import assert from "node:assert/strict";
import test from "node:test";
import {
  filterRecordsForSettingsSection,
  getSettingEnumOptions,
  getSettingValueKind,
  groupSettingRecordsForForm,
  isVisibleSettingDefinition,
  isVisibleSettingsSection,
  parseSettingFormValue,
  toEditableSettingInput,
  type SettingDefinitionRecord
} from "../src/pages/settings/settings-page.utils.js";
import type { RenderableAdminSettingsSection } from "../src/runtime/admin-route-runtime.js";

function setting(
  input: Partial<SettingDefinitionRecord> & { key: string }
): SettingDefinitionRecord {
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
    setting({ key: "core-pack:branding:logo_url", category: "branding" })
  ];

  const explicitSection = {
    id: "general",
    pluginId: "core-pack",
    settingKeys: ["core-pack:site:name"]
  } as RenderableAdminSettingsSection;
  const categorySection = {
    id: "branding",
    pluginId: "core-pack",
    category: "branding"
  } as RenderableAdminSettingsSection;

  assert.deepEqual(filterRecordsForSettingsSection(records, explicitSection), [records[0]]);
  assert.deepEqual(filterRecordsForSettingsSection(records, categorySection), [records[1]]);
});

test("core technical settings stay hidden from the main settings workspace", () => {
  const records = [
    setting({ key: "core-pack:site:name", category: "site" }),
    setting({
      key: "core-pack:user_flows:public_registration_enabled",
      category: "user_flows"
    }),
    setting({ key: "core-pack:auth:login_max_attempts", category: "auth" }),
    setting({ key: "core-pack:cache:redis_retry_delay", category: "cache" }),
    setting({
      key: "commerce-pack:auth:public_checkout_mode",
      category: "auth",
      ownerPluginId: "commerce-pack"
    })
  ];

  assert.equal(isVisibleSettingDefinition(records[0]), true);
  assert.equal(isVisibleSettingDefinition(records[1]), true);
  assert.equal(isVisibleSettingDefinition(records[2]), false);
  assert.equal(isVisibleSettingDefinition(records[3]), false);
  assert.equal(isVisibleSettingDefinition(records[4]), true);
  assert.equal(
    isVisibleSettingsSection({
      id: "core-pack-auth-settings",
      pluginId: "core-pack"
    } as RenderableAdminSettingsSection),
    false
  );

  assert.deepEqual(
    groupSettingRecordsForForm(records).flatMap((group) => group.records),
    [records[0], records[1], records[4]]
  );
});

test("groupSettingRecordsForForm assigns readable groups from visible category and keys", () => {
  const groups = groupSettingRecordsForForm([
    setting({ key: "core-pack:site:name", category: "site" }),
    setting({ key: "core-pack:features:editorial_workflow", category: "features" }),
    setting({
      key: "core-pack:user_flows:public_registration_enabled",
      category: "user_flows"
    }),
    setting({
      key: "commerce-pack:auth:public_checkout_mode",
      category: "auth",
      ownerPluginId: "commerce-pack"
    })
  ]);

  assert.deepEqual(
    groups.map((group) => group.title),
    ["Site details", "Feature flags", "User lifecycle", "Authentication"]
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
  assert.deepEqual(parseSettingFormValue(jsonSetting, '{"ttl":60}'), { ttl: 60 });
  assert.equal(toEditableSettingInput({ ttl: 60 }), JSON.stringify({ ttl: 60 }, null, 2));
});

test("getSettingEnumOptions normalizes primitive enum values", () => {
  assert.deepEqual(getSettingEnumOptions({ enum: ["a", 2, true, null] }), ["a", "2", "true"]);
});
