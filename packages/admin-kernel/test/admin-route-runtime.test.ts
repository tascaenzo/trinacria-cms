import assert from "node:assert/strict";
import test from "node:test";
import type { TranslateFn } from "../src/lib/i18n.js";
import type { RenderableAdminContribution } from "../src/runtime/admin-route-runtime.js";
import type { AdminRuntimePluginInfo } from "../src/contracts.js";
import {
  createOfficialAdminContributions,
  withOfficialAdminRouteRenderers
} from "../src/contributions/official-admin-contributions.js";
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

test("official registry keeps user profile mounted as a shell route", () => {
  const registry = buildAdminRegistry(
    createOfficialAdminContributions({
      pluginCount: 1,
      capabilityCount: 0,
      systemStateLabel: "ok"
    }),
    [],
    identityTranslate
  );

  assert.ok(registry.routes.some((route) => route.id === "profile"));
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

test("buildAdminRegistry filters routes from plugins that are not loaded", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "registered",
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

test("buildAdminRegistry filters routes by permission guard", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: []
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
        guards: [{ permissionKey: "test-pack:admin:read" }],
        render: () => null
      }
    ],
    navigation: []
  };

  const deniedRegistry = buildAdminRegistry([contribution], [plugin], identityTranslate);
  assert.equal(deniedRegistry.routes.length, 0);

  const allowedRegistry = buildAdminRegistry([contribution], [plugin], identityTranslate, [
    "test-pack:admin:read"
  ]);
  assert.equal(allowedRegistry.routes.length, 1);
});

test("buildAdminRegistry accepts wildcard permission grants for permission guards", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: []
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "test-pack",
    displayName: "Test Pack",
    routes: [
      {
        id: "users-route",
        path: "/users",
        pluginId: "test-pack",
        title: "Users",
        guards: [{ permissionKey: "test-pack:users:read" }],
        render: () => null
      },
      {
        id: "billing-route",
        path: "/billing",
        pluginId: "test-pack",
        title: "Billing",
        guards: [{ permissionKey: "test-pack:billing:read" }],
        render: () => null
      }
    ],
    navigation: [
      {
        id: "nav-users",
        routeId: "users-route",
        title: "Users"
      },
      {
        id: "nav-billing",
        routeId: "billing-route",
        title: "Billing"
      }
    ]
  };

  const scopedRegistry = buildAdminRegistry([contribution], [plugin], identityTranslate, [
    "test-pack:users:*"
  ]);
  assert.deepEqual(
    scopedRegistry.routes.map((route) => route.id),
    ["users-route"]
  );
  assert.deepEqual(
    scopedRegistry.navigation.map((item) => item.id),
    ["nav-users"]
  );

  const fullRegistry = buildAdminRegistry([contribution], [plugin], identityTranslate, [
    "test-pack:*:*"
  ]);
  assert.deepEqual(
    fullRegistry.routes.map((route) => route.id),
    ["users-route", "billing-route"]
  );
});

test("official core-pack route renderers use capability guards for sidebar visibility", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "core-pack",
    installed: true,
    version: "0.1.0",
    state: "loaded",
    capabilities: ["users.read"]
  };

  const contribution = withOfficialAdminRouteRenderers([
    {
      pluginId: "core-pack",
      displayName: "Core Pack",
      routes: [
        {
          id: "users",
          path: "/users",
          pluginId: "core-pack",
          title: "Users",
          guards: [{ pluginId: "core-pack", permissionKey: "core-pack:users:read" }],
          render: () => null
        }
      ],
      navigation: [
        {
          id: "nav-users",
          routeId: "users",
          title: "Users",
          guards: [{ pluginId: "core-pack", permissionKey: "core-pack:users:read" }]
        }
      ]
    }
  ]);

  const registry = buildAdminRegistry(contribution, [plugin], identityTranslate);

  assert.deepEqual(
    registry.routes.map((route) => route.id),
    ["users"]
  );
  assert.deepEqual(
    registry.navigation.map((item) => item.id),
    ["nav-users"]
  );
});

test("official core-pack navigation uses registered shell icon names", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "core-pack",
    installed: true,
    version: "0.1.0",
    state: "loaded",
    capabilities: ["users.read", "roles.read"]
  };

  const contribution = withOfficialAdminRouteRenderers([
    {
      pluginId: "core-pack",
      displayName: "Core Pack",
      routes: [
        {
          id: "users",
          path: "/users",
          pluginId: "core-pack",
          title: "Users",
          render: () => null
        },
        {
          id: "roles",
          path: "/roles",
          pluginId: "core-pack",
          title: "Roles",
          render: () => null
        }
      ],
      navigation: [
        {
          id: "nav-users",
          routeId: "users",
          title: "Users"
        },
        {
          id: "nav-roles",
          routeId: "roles",
          title: "Roles"
        }
      ]
    }
  ]);

  const registry = buildAdminRegistry(contribution, [plugin], identityTranslate);

  assert.deepEqual(
    registry.navigation.map((item) => [item.id, item.icon]),
    [
      ["nav-users", "users"],
      ["nav-roles", "shield-check"]
    ]
  );
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

test("buildAdminRegistry deduplicates repeated route, navigation, and resource ids", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: ["items.read"]
  };

  const baseContribution: RenderableAdminContribution = {
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
    navigation: [{ id: "nav-items", routeId: "items", title: "Items" }],
    resources: [
      {
        id: "test-pack.items",
        pluginId: "test-pack",
        entityName: "items",
        routeId: "items",
        title: "Items"
      }
    ]
  };

  const overridingContribution: RenderableAdminContribution = {
    ...baseContribution,
    routes: [
      {
        id: "items",
        path: "/items",
        pluginId: "test-pack",
        title: "Runtime Items",
        render: () => null
      }
    ],
    navigation: [{ id: "nav-items", routeId: "items", title: "Runtime Items" }],
    resources: [
      {
        id: "test-pack.items",
        pluginId: "test-pack",
        entityName: "items",
        routeId: "items",
        title: "Runtime Items"
      }
    ]
  };

  const registry = buildAdminRegistry(
    [baseContribution, overridingContribution],
    [plugin],
    identityTranslate
  );

  assert.equal(registry.routes.length, 1);
  assert.equal(registry.routes[0].title, "Runtime Items");
  assert.equal(registry.navigation.length, 1);
  assert.equal(registry.navigation[0].title, "Runtime Items");
  assert.equal(registry.resources.length, 1);
  assert.equal(registry.resources[0].title, "Runtime Items");
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

test("buildAdminRegistry filters and translates resource actions", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "test-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: ["test.read", "test.create"]
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
        fields: [],
        actions: [
          {
            id: "create",
            intent: "create",
            title: "Create",
            titleKey: "actions.create",
            endpoint: { method: "POST", path: "/items" },
            guards: [{ capability: "test.create" }]
          },
          {
            id: "delete",
            intent: "delete",
            title: "Delete",
            endpoint: { method: "DELETE", path: "/items/:id" },
            guards: [{ capability: "test.delete" }]
          }
        ]
      }
    ]
  };

  const registry = buildAdminRegistry([contribution], [plugin], (key, fallback) =>
    key === "actions.create" ? "Create item" : (fallback ?? key)
  );

  assert.equal(registry.resources[0].actions?.length, 1);
  assert.equal(registry.resources[0].actions?.[0].id, "create");
  assert.equal(registry.resources[0].actions?.[0].title, "Create item");
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

test("buildAdminRegistry includes visible dashboard widgets and settings sections", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "catalog-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: ["catalog.dashboard", "catalog.settings"]
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "catalog-pack",
    displayName: "Catalog",
    routes: [],
    navigation: [],
    widgets: [
      {
        id: "catalog-health",
        pluginId: "catalog-pack",
        title: "Catalog health",
        titleKey: "catalog.widget.health",
        guards: [{ capability: "catalog.dashboard" }]
      }
    ],
    settings: [
      {
        id: "catalog-general",
        pluginId: "catalog-pack",
        title: "Catalog settings",
        titleKey: "catalog.settings.general",
        guards: [{ capability: "catalog.settings" }]
      }
    ]
  };

  const registry = buildAdminRegistry(
    [contribution],
    [plugin],
    (_key, fallback) => `t:${fallback}`
  );

  assert.equal(registry.widgets.length, 1);
  assert.equal(registry.widgets[0].title, "t:Catalog health");
  assert.equal(registry.settings.length, 1);
  assert.equal(registry.settings[0].title, "t:Catalog settings");
});

test("buildAdminRegistry resolves settings section renderers from component refs", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "email-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: []
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "email-pack",
    displayName: "Email",
    routes: [],
    navigation: [],
    settings: [
      {
        id: "email-pack-email-template-settings",
        pluginId: "email-pack",
        kind: "custom",
        componentRef: "email-pack:email-template-manager",
        title: "Email templates"
      }
    ]
  };

  const registry = buildAdminRegistry([contribution], [plugin], identityTranslate);

  assert.equal(registry.settings.length, 1);
  assert.equal(typeof registry.settings[0].render, "function");
});

test("buildAdminRegistry resolves dashboard widget renderers from component refs", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "email-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: []
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "email-pack",
    displayName: "Email",
    routes: [],
    navigation: [],
    widgets: [
      {
        id: "email-pack-delivery-status",
        pluginId: "email-pack",
        kind: "custom",
        componentRef: "email-pack:delivery-status-widget",
        title: "Email delivery"
      }
    ]
  };

  const registry = buildAdminRegistry([contribution], [plugin], identityTranslate);

  assert.equal(registry.widgets.length, 1);
  assert.equal(typeof registry.widgets[0].render, "function");
});

test("buildAdminRegistry filters dashboard widgets and settings sections by guards", () => {
  const plugin: AdminRuntimePluginInfo = {
    pluginId: "catalog-pack",
    installed: true,
    version: "1.0.0",
    state: "loaded",
    capabilities: []
  };

  const contribution: RenderableAdminContribution = {
    pluginId: "catalog-pack",
    displayName: "Catalog",
    routes: [],
    navigation: [],
    widgets: [
      {
        id: "catalog-health",
        pluginId: "catalog-pack",
        title: "Catalog health",
        guards: [{ capability: "catalog.dashboard" }]
      }
    ],
    settings: [
      {
        id: "catalog-general",
        pluginId: "catalog-pack",
        title: "Catalog settings",
        guards: [{ permissionKey: "catalog-pack:settings:read" }]
      }
    ]
  };

  const deniedRegistry = buildAdminRegistry([contribution], [plugin], identityTranslate);
  assert.equal(deniedRegistry.widgets.length, 0);
  assert.equal(deniedRegistry.settings.length, 0);

  const allowedRegistry = buildAdminRegistry([contribution], [plugin], identityTranslate, [
    "catalog-pack:settings:read"
  ]);
  assert.equal(allowedRegistry.widgets.length, 0);
  assert.equal(allowedRegistry.settings.length, 1);
});
