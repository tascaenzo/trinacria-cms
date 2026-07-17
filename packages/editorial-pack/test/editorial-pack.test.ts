import assert from "node:assert/strict";
import test from "node:test";
import { validatePluginManifest } from "@trinacria-cms/kernel";
import {
  EDITORIAL_PACK_MANIFEST,
  EDITORIAL_PACK_PERMISSION_KEY_LIST,
  EDITORIAL_PACK_SETTING_DEFINITIONS
} from "../src/index.js";

test("editorial-pack declares the plugin foundation", () => {
  const manifest = validatePluginManifest(EDITORIAL_PACK_MANIFEST);

  assert.equal(manifest.id, "editorial-pack");
  assert.deepEqual(manifest.dependencies, [
    { pluginId: "core-pack", versionRange: "^0.1.0", optional: false },
    { pluginId: "media-pack", versionRange: "^0.1.0", optional: false }
  ]);
  assert.deepEqual(
    manifest.entities.map((entity) => entity.name),
    [
      "content_types",
      "entries",
      "entry_revisions",
      "review_assignments",
      "editorial_comments",
      "taxonomies",
      "taxonomy_terms",
      "entry_taxonomy_terms",
      "entry_relations"
    ]
  );
  assert.deepEqual(
    manifest.settings.map((setting) => setting.key).sort(),
    EDITORIAL_PACK_SETTING_DEFINITIONS.map((setting) => setting.key).sort()
  );
  assert.deepEqual(
    manifest.security?.grants?.find((grant) => grant.roleCode === "admin")?.permissionKeys,
    EDITORIAL_PACK_PERMISSION_KEY_LIST
  );
  assert.deepEqual(
    manifest.security?.roles?.map((role) => role.code),
    ["author", "reviewer", "content-manager"]
  );
});
