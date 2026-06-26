import type { AdminResourceDefinition } from "../contracts.js";

const CORE_PACK_READONLY_PERMISSION_KEYS = [
  "core-pack:plugins:read",
  "core-pack:users:read",
  "core-pack:users:write",
  "core-pack:roles:read",
  "core-pack:roles:write",
  "core-pack:permissions:read",
  "core-pack:permissions:write",
  "core-pack:settings:read",
  "core-pack:settings:write",
  "core-pack:settings.secrets:read",
  "core-pack:settings.secrets:write"
] as const;

export const OFFICIAL_CORE_RESOURCE_META: Record<string, Partial<AdminResourceDefinition>> = {
  "core-pack:users": {
    guards: [{ pluginId: "core-pack", capability: "users.read" }],
    titleKey: "official.resource.users.title",
    summary: "User records managed by the core identity module.",
    summaryKey: "official.resource.users.summary",
    order: 10,
    capabilities: {
      list: "users.read",
      create: "users.write",
      update: "users.write"
    },
    actions: [
      {
        id: "create-user",
        intent: "create",
        title: "Create user",
        titleKey: "users.actions.create",
        endpoint: { method: "POST", path: "/v1/users" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "users.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              email: { type: "string", labelKey: "auth.login.email_label" },
              firstName: { type: "string", labelKey: "common.form.first_name" },
              lastName: { type: "string", labelKey: "common.form.last_name" }
            },
            required: ["email", "firstName", "lastName"]
          }
        }
      },
      {
        id: "update-user-profile",
        intent: "update",
        title: "Edit",
        titleKey: "common.actions.edit",
        endpoint: { method: "PATCH", path: "/v1/users/:id" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "users.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              firstName: { type: "string", labelKey: "common.form.first_name" },
              lastName: { type: "string", labelKey: "common.form.last_name" },
              status: {
                type: "string",
                enum: ["active", "suspended"],
                labelKey: "common.table.status"
              }
            },
            required: ["firstName", "lastName", "status"]
          }
        }
      }
    ],
    fields: [
      {
        key: "firstName",
        label: "First name",
        labelKey: "common.form.first_name",
        primary: true,
        table: true,
        form: true
      },
      {
        key: "lastName",
        label: "Last name",
        labelKey: "common.form.last_name",
        table: true,
        form: true
      },
      { key: "email", label: "Email", labelKey: "auth.login.email_label", table: true, form: true },
      {
        key: "status",
        label: "Status",
        labelKey: "common.table.status",
        kind: "status",
        table: true
      },
      {
        key: "updatedAt",
        label: "Updated",
        labelKey: "common.table.updated",
        kind: "datetime",
        table: true
      }
    ]
  },
  "core-pack:roles": {
    guards: [{ pluginId: "core-pack", capability: "roles.read" }],
    titleKey: "official.resource.roles.title",
    summary: "Role records and embedded permission grants.",
    summaryKey: "official.resource.roles.summary",
    order: 20,
    capabilities: {
      list: "roles.read",
      create: "roles.write",
      update: "roles.write"
    },
    actions: [
      {
        id: "create-role",
        intent: "create",
        title: "Create role",
        titleKey: "roles.actions.create",
        endpoint: { method: "POST", path: "/v1/roles" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "roles.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              code: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              permissions: {
                type: "array",
                items: { type: "string" },
                "x-options": {
                  endpoint: { method: "GET", path: "/v1/permissions" },
                  valuePath: "data",
                  valueField: "key",
                  labelField: "key",
                  descriptionField: "displayName",
                  metaField: "status"
                }
              }
            },
            required: ["code", "name"]
          }
        }
      },
      {
        id: "update-role",
        intent: "update",
        title: "Edit",
        titleKey: "common.actions.edit",
        endpoint: { method: "PATCH", path: "/v1/roles/:id" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "roles.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              status: { type: "string", enum: ["active", "disabled"] },
              permissions: {
                type: "array",
                items: { type: "string" },
                "x-options": {
                  endpoint: { method: "GET", path: "/v1/permissions" },
                  valuePath: "data",
                  valueField: "key",
                  labelField: "key",
                  descriptionField: "displayName",
                  metaField: "status"
                }
              }
            },
            required: ["name"]
          }
        }
      }
    ],
    fields: [
      {
        key: "name",
        label: "Name",
        labelKey: "roles.form.name",
        primary: true,
        table: true,
        form: true
      },
      { key: "code", label: "Code", labelKey: "roles.form.code", table: true, form: true },
      {
        key: "permissions",
        label: "Permissions",
        labelKey: "roles.table.permissions",
        kind: "tags",
        table: true,
        form: true
      },
      {
        key: "status",
        label: "Status",
        labelKey: "common.table.status",
        kind: "status",
        table: true
      }
    ]
  },
  "core-pack:permissions": {
    guards: [{ pluginId: "core-pack", capability: "permissions.read" }],
    titleKey: "official.resource.permissions.title",
    summary: "Canonical permission records contributed by plugins.",
    summaryKey: "official.resource.permissions.summary",
    order: 30,
    capabilities: {
      list: "permissions.read",
      create: "permissions.write",
      update: "permissions.write"
    },
    actions: [
      {
        id: "create-permission",
        intent: "create",
        title: "Create permission",
        titleKey: "permissions.actions.create",
        endpoint: { method: "POST", path: "/v1/permissions" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "permissions.write" }],
        input: {
          schema: {
            type: "object",
            properties: {
              key: { type: "string" },
              displayName: { type: "string" },
              description: { type: "string" }
            },
            required: ["key", "displayName"]
          }
        }
      },
      {
        id: "update-permission",
        intent: "update",
        title: "Edit",
        titleKey: "common.actions.edit",
        endpoint: { method: "PATCH", path: "/v1/permissions/:id" },
        policy: { allowedPathPrefixes: ["/admin", "/v1"] },
        guards: [{ pluginId: "core-pack", capability: "permissions.write" }],
        recordGuards: [
          {
            field: "key",
            operator: "notIn",
            values: CORE_PACK_READONLY_PERMISSION_KEYS
          }
        ],
        input: {
          schema: {
            type: "object",
            properties: {
              displayName: { type: "string" },
              description: { type: "string" },
              status: { type: "string", enum: ["active", "disabled"] }
            },
            required: ["displayName"]
          }
        }
      }
    ],
    fields: [
      {
        key: "displayName",
        label: "Display name",
        labelKey: "common.form.display_name",
        primary: true,
        table: true,
        form: true
      },
      { key: "key", label: "Key", labelKey: "common.form.key", table: true, form: true },
      { key: "sourcePluginId", label: "Source", labelKey: "permissions.table.source", table: true },
      {
        key: "status",
        label: "Status",
        labelKey: "common.table.status",
        kind: "status",
        table: true
      }
    ]
  }
};
