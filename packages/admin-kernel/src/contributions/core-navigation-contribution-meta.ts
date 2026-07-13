import type { AdminNavigationItem } from "../contracts.js";

export const OFFICIAL_CORE_NAV_META: Record<string, Partial<AdminNavigationItem>> = {
  "nav-plugins": {
    guards: [{ pluginId: "core-pack", capability: "plugins.read" }],
    titleKey: "official.nav.plugins.title",
    icon: "plug",
    group: "Core",
    groupKey: "official.nav.group.core"
  },
  "nav-users": {
    guards: [{ pluginId: "core-pack", capability: "users.read" }],
    titleKey: "official.nav.users.title",
    icon: "users",
    group: "Identity",
    groupKey: "official.nav.group.identity"
  },
  "nav-roles": {
    guards: [{ pluginId: "core-pack", capability: "roles.read" }],
    titleKey: "official.nav.roles.title",
    icon: "shield-check",
    group: "Identity",
    groupKey: "official.nav.group.identity"
  },
  "nav-permissions": {
    guards: [{ pluginId: "core-pack", capability: "permissions.read" }],
    titleKey: "official.nav.permissions.title",
    icon: "folder-cog",
    group: "Identity",
    groupKey: "official.nav.group.identity"
  },
  "nav-settings": {
    guards: [{ pluginId: "core-pack", capability: "settings.read" }],
    titleKey: "official.nav.settings.title",
    icon: "settings-2",
    group: "Configuration",
    groupKey: "official.nav.group.configuration"
  }
};
