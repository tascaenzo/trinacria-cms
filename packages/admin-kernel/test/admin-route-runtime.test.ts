import assert from "node:assert/strict";
import test from "node:test";
import type { TranslateFn } from "../src/lib/i18n.js";
import type { RenderableAdminContribution } from "../src/runtime/admin-route-runtime.js";
import type { AdminRuntimePluginInfo } from "../src/contracts.js";
import { buildAdminRegistry } from "../src/runtime/admin-route-runtime.js";

function identityTranslate(key: string, fallback?: string): string {
  return fallback ?? key;
}

test("buildAdminRegistry returns empty snapshot for no contributions", () => {
  const registry = buildAdminRegistry([], [], identityTranslate);
  assert.equal(registry.routes.length, 0);
  assert.equal(registry.navigation.length, 0);
  assert.equal(registry.resources.length, 0);
  assert.equal(registry.widgets.length, 0);
  assert.equal(registry.settings.length, 0);
});

test("buildAdminRegistry includes routes from active plugin contributions", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: ["test.read"]
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "test-pack",
    displayName: "Test Pack",
    routes: [
      {
        id: "test-route",
        path: "/test",
        pluginId: "test-pack",
        title: "Test Route",
        order: 10,
        render: () => null
      }
    ],
    navigation: [
      {
        id: "nav-test",
        routeId: "test-route",
        title: "Test",
        icon: "test",
        order: 10
      }
    ]
  };

  const registry = buildAdminRegistry([contribution], [plugin], identityTranslate);
  assert.equal(registry.routes.length, 1);
  assert.equal(registry.routes[0].id, "test-route");
  assert.equal(registry.routes[0].title, "Test Route");
  assert.equal(registry.navigation.length, 1);
  assert.equal(registry.navigation[0].id, "nav-test");
});

test("buildAdminRegistry filters routes from disabled plugins", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "disabled",
    capabilities: ["test.read"]
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "test-pack",
    displayName: "Test Pack",
    routes: [
      {
        id: "test-route",
        path: "/test",
        pluginId: "test-pack",
        title: "Test Route",
        render: () => null
      }
    ],
    navigation: []
  };

  const registry = buildAdminRegistry([contribution], [plugin], identityTranslate);
  assert.equal(registry.routes.length, 0);
});

test("buildAdminRegistry filters routes from failed plugins", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "failed",
    capabilities: ["test.read"]
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "test-pack",
    displayName: "Test Pack",
    routes: [
      {
        id: "test-route",
        path: "/test",
        pluginId: "test-pack",
        title: "Test Route",
        render: () => null
      }
    ],
    navigation: []
  };

  const registry = buildAdminRegistry([contribution], [plugin], identityTranslate);
  assert.equal(registry.routes.length, 0);
});

test("buildAdminRegistry filters routes by capability guard", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: [] // missing required capability
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "test-pack",
    displayName: "Test Pack",
    routes: [
      {
        id: "admin-route",
        path: "/admin",
        pluginId: "test-pack",
        title: "Admin",
        guards: [{ pluginId: "test-pack", capability: "test.admin" }],
        render: () => null
      }
    ],
    navigation: []
  };

  const registry = buildAdminRegistry([contribution], [plugin], identityTranslate);
  assert.equal(registry.routes.length, 0);
});

test("buildAdminRegistry applies i18n translation keys", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: []
  };

  const t: TranslateFn = (_key, fallback) => `translated:${fallback}`;

  const contribution: RenderableAdminContribution = {
    pluginId: "test-pack",
    displayName: "Test Pack",
    routes: [
      {
        id: "localized-route",
        path: "/localized",
        pluginId: "test-pack",
        title: "Original",
        titleKey: "route.test.title",
        summary: "Original summary",
        summaryKey: "route.test.summary",
        order: 1,
        render: () => null
      }
    ],
    navigation: [
      {
        id: "nav-localized",
        routeId: "localized-route",
        title: "Nav Original",
        titleKey: "nav.test.title",
        group: "Core",
        groupKey: "nav.group.core"
      }
    ]
  };

  const registry = buildAdminRegistry([contribution], [plugin], t);
  assert.equal(registry.routes[0].title, "translated:Original");
  assert.equal(registry.routes[0].summary, "translated:Original summary");
  assert.equal(registry.navigation[0].title, "translated:Nav Original");
  assert.equal(registry.navigation[0].group, "translated:Core");
});

test("buildAdminRegistry sorts routes and navigation by order", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "multi-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: []
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "multi-pack",
    displayName: "Multi",
    routes: [
      {
        id: "z-route",
        path: "/z",
        pluginId: "multi-pack",
        title: "Z Route",
        order: 100,
        render: () => null
      },
      {
        id: "a-route",
        path: "/a",
        pluginId: "multi-pack",
        title: "A Route",
        order: 10,
        render: () => null
      }
    ],
    navigation: [
      {
        id: "nav-z",
        routeId: "z-route",
        title: "Z Nav",
        order: 100
      },
      {
        id: "nav-a",
        routeId: "a-route",
        title: "A Nav",
        order: 10
      }
    ]
  };

  const registry = buildAdminRegistry([contribution], [plugin], identityTranslate);
  assert.equal(registry.routes[0].id, "a-route");
  assert.equal(registry.routes[1].id, "z-route");
  assert.equal(registry.navigation[0].id, "nav-a");
  assert.equal(registry.navigation[1].id, "nav-z");
});

test("buildAdminRegistry includes resources with entity schema metadata", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: ["test.read"]
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "test-pack",
    displayName: "Test Pack",
    routes: [
      {
        id: "items",
        path: "/items",
        pluginId: "test-pack",
        title: "Items",
        render: () => null
      }
    ],
    navigation: [],
    resources: [
      {
        id: "test-pack.items",
        pluginId: "test-pack",
        entityName: "items",
        routeId: "items",
        title: "Items",
        order: 10,
        fields: [
          { key: "name", label: "Name", primary: true, table: true, form: true },
          { key: "status", label: "Status", kind: "status", table: true }
        ]
      }
    ]
  };

  const registry = buildAdminRegistry([contribution], [plugin], identityTranslate);
  assert.equal(registry.resources.length, 1);
  assert.equal(registry.resources[0].entityName, "items");
  assert.equal(registry.resources[0].fields.length, 2);
  assert.equal(registry.resources[0].fields[0].label, "Name");
});

test("buildAdminRegistry filters resources when plugin is not installed", () => {
  const contribution: RenderableAdminContribution = {
    pluginId: "ghost-pack",
    displayName: "Ghost",
    routes: [],
    navigation: [],
    resources: [
      {
        id: "ghost-pack.data",
        pluginId: "ghost-pack",
        entityName: "data",
        title: "Data",
        fields: []
      }
    ]
  };

  const registry = buildAdminRegistry([contribution], [], identityTranslate);
  assert.equal(registry.resources.length, 0);
});
