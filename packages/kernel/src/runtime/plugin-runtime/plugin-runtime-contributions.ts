import type {
  PluginContributionCatalogSnapshot,
  PluginContributionSnapshot
} from "../../contracts/plugin-runtime.js";
import type { PluginManifest } from "../../contracts/plugin-manifest.js";
import { PluginManifestError } from "../../errors/plugin-errors.js";
import { buildContributionKey, buildSettingKey } from "../plugin-namespace/plugin-namespace.js";

type ContributionMap<TDeclaration> = Map<string, PluginContributionSnapshot<TDeclaration>>;

export class PluginContributionRegistry {
  private readonly entities: ContributionMap<NonNullable<PluginManifest["entities"]>[number]> =
    new Map();
  private readonly settings: ContributionMap<NonNullable<PluginManifest["settings"]>[number]> =
    new Map();
  private readonly emittedEvents: ContributionMap<
    NonNullable<NonNullable<PluginManifest["events"]>["emits"]>[number]
  > = new Map();
  private readonly eventSubscriptions: ContributionMap<
    NonNullable<NonNullable<PluginManifest["events"]>["subscribes"]>[number]
  > = new Map();
  private readonly adminNavigation: ContributionMap<
    NonNullable<NonNullable<PluginManifest["admin"]>["navigation"]>[number]
  > = new Map();
  private readonly adminRoutes: ContributionMap<
    NonNullable<NonNullable<PluginManifest["admin"]>["routes"]>[number]
  > = new Map();
  private readonly adminResources: ContributionMap<
    NonNullable<NonNullable<PluginManifest["admin"]>["resources"]>[number]
  > = new Map();
  private readonly adminWidgets: ContributionMap<
    NonNullable<NonNullable<PluginManifest["admin"]>["widgets"]>[number]
  > = new Map();
  private readonly adminSettingsSections: ContributionMap<
    NonNullable<NonNullable<PluginManifest["admin"]>["settingsSections"]>[number]
  > = new Map();

  upsert(manifest: PluginManifest): void {
    const next = this.clone();
    next.remove(manifest.id);
    next.add(manifest);
    next.assertNoGlobalAdminPathCollisions(manifest.id);
    this.replaceWith(next);
  }

  remove(pluginId: string): void {
    this.removeFrom(this.entities, pluginId);
    this.removeFrom(this.settings, pluginId);
    this.removeFrom(this.emittedEvents, pluginId);
    this.removeFrom(this.eventSubscriptions, pluginId);
    this.removeFrom(this.adminNavigation, pluginId);
    this.removeFrom(this.adminRoutes, pluginId);
    this.removeFrom(this.adminResources, pluginId);
    this.removeFrom(this.adminWidgets, pluginId);
    this.removeFrom(this.adminSettingsSections, pluginId);
  }

  snapshot(): PluginContributionCatalogSnapshot {
    return {
      entities: this.sorted(this.entities),
      settings: this.sorted(this.settings),
      events: {
        emits: this.sorted(this.emittedEvents),
        subscribes: this.sorted(this.eventSubscriptions)
      },
      admin: {
        navigation: this.sorted(this.adminNavigation),
        routes: this.sorted(this.adminRoutes),
        resources: this.sorted(this.adminResources),
        widgets: this.sorted(this.adminWidgets),
        settingsSections: this.sorted(this.adminSettingsSections)
      }
    };
  }

  private add(manifest: PluginManifest): void {
    for (const entity of manifest.entities ?? []) {
      this.entities.set(buildContributionKey(manifest.id, entity.name), {
        pluginId: manifest.id,
        key: buildContributionKey(manifest.id, entity.name),
        declaration: entity
      });
    }

    for (const setting of manifest.settings ?? []) {
      this.settings.set(buildSettingKey(manifest.id, setting.namespace, setting.key), {
        pluginId: manifest.id,
        key: buildSettingKey(manifest.id, setting.namespace, setting.key),
        declaration: setting
      });
    }

    for (const event of manifest.events?.emits ?? []) {
      this.emittedEvents.set(buildContributionKey(manifest.id, event.name), {
        pluginId: manifest.id,
        key: buildContributionKey(manifest.id, event.name),
        declaration: event
      });
    }

    for (const subscription of manifest.events?.subscribes ?? []) {
      const key = `${manifest.id}:${subscription.eventName}:${subscription.handler}`;
      this.eventSubscriptions.set(key, {
        pluginId: manifest.id,
        key,
        declaration: subscription
      });
    }

    for (const item of manifest.admin?.navigation ?? []) {
      this.adminNavigation.set(buildContributionKey(manifest.id, item.id), {
        pluginId: manifest.id,
        key: buildContributionKey(manifest.id, item.id),
        declaration: item
      });
    }

    for (const route of manifest.admin?.routes ?? []) {
      this.adminRoutes.set(buildContributionKey(manifest.id, route.id), {
        pluginId: manifest.id,
        key: buildContributionKey(manifest.id, route.id),
        declaration: route
      });
    }

    for (const resource of manifest.admin?.resources ?? []) {
      this.adminResources.set(buildContributionKey(manifest.id, resource.id), {
        pluginId: manifest.id,
        key: buildContributionKey(manifest.id, resource.id),
        declaration: resource
      });
    }

    for (const widget of manifest.admin?.widgets ?? []) {
      this.adminWidgets.set(buildContributionKey(manifest.id, widget.id), {
        pluginId: manifest.id,
        key: buildContributionKey(manifest.id, widget.id),
        declaration: widget
      });
    }

    for (const section of manifest.admin?.settingsSections ?? []) {
      this.adminSettingsSections.set(buildContributionKey(manifest.id, section.id), {
        pluginId: manifest.id,
        key: buildContributionKey(manifest.id, section.id),
        declaration: section
      });
    }
  }

  private assertNoGlobalAdminPathCollisions(registeringPluginId: string): void {
    this.assertUniqueAdminPath(
      registeringPluginId,
      "admin route path",
      this.sorted(this.adminRoutes).map((route) => ({
        pluginId: route.pluginId,
        key: route.key,
        path: route.declaration.path
      }))
    );
    this.assertUniqueAdminPath(
      registeringPluginId,
      "admin resource routeBase",
      this.sorted(this.adminResources).map((resource) => ({
        pluginId: resource.pluginId,
        key: resource.key,
        path: resource.declaration.routeBase
      }))
    );
    this.assertUniqueAdminPath(
      registeringPluginId,
      "admin resource apiBase",
      this.sorted(this.adminResources).map((resource) => ({
        pluginId: resource.pluginId,
        key: resource.key,
        path: resource.declaration.apiBase
      }))
    );
  }

  private assertUniqueAdminPath(
    registeringPluginId: string,
    kind: string,
    items: ReadonlyArray<{ pluginId: string; key: string; path: string }>
  ): void {
    const seen = new Map<string, { pluginId: string; key: string }>();

    for (const item of items) {
      const normalized = item.path.trim().toLowerCase();
      const existing = seen.get(normalized);
      if (existing) {
        throw new PluginManifestError(`Duplicate ${kind} "${item.path}"`, {
          pluginId: registeringPluginId,
          path: item.path,
          currentOwner: item.pluginId,
          existingOwner: existing.pluginId,
          currentKey: item.key,
          existingKey: existing.key
        });
      }
      seen.set(normalized, { pluginId: item.pluginId, key: item.key });
    }
  }

  private clone(): PluginContributionRegistry {
    const cloned = new PluginContributionRegistry();
    this.copyInto(this.entities, cloned.entities);
    this.copyInto(this.settings, cloned.settings);
    this.copyInto(this.emittedEvents, cloned.emittedEvents);
    this.copyInto(this.eventSubscriptions, cloned.eventSubscriptions);
    this.copyInto(this.adminNavigation, cloned.adminNavigation);
    this.copyInto(this.adminRoutes, cloned.adminRoutes);
    this.copyInto(this.adminResources, cloned.adminResources);
    this.copyInto(this.adminWidgets, cloned.adminWidgets);
    this.copyInto(this.adminSettingsSections, cloned.adminSettingsSections);
    return cloned;
  }

  private replaceWith(next: PluginContributionRegistry): void {
    this.clear();
    this.copyInto(next.entities, this.entities);
    this.copyInto(next.settings, this.settings);
    this.copyInto(next.emittedEvents, this.emittedEvents);
    this.copyInto(next.eventSubscriptions, this.eventSubscriptions);
    this.copyInto(next.adminNavigation, this.adminNavigation);
    this.copyInto(next.adminRoutes, this.adminRoutes);
    this.copyInto(next.adminResources, this.adminResources);
    this.copyInto(next.adminWidgets, this.adminWidgets);
    this.copyInto(next.adminSettingsSections, this.adminSettingsSections);
  }

  private clear(): void {
    this.entities.clear();
    this.settings.clear();
    this.emittedEvents.clear();
    this.eventSubscriptions.clear();
    this.adminNavigation.clear();
    this.adminRoutes.clear();
    this.adminResources.clear();
    this.adminWidgets.clear();
    this.adminSettingsSections.clear();
  }

  private removeFrom<TDeclaration>(
    contributions: ContributionMap<TDeclaration>,
    pluginId: string
  ): void {
    for (const [key, contribution] of contributions) {
      if (contribution.pluginId === pluginId) {
        contributions.delete(key);
      }
    }
  }

  private copyInto<TDeclaration>(
    from: ContributionMap<TDeclaration>,
    to: ContributionMap<TDeclaration>
  ): void {
    for (const [key, contribution] of from) {
      to.set(key, contribution);
    }
  }

  private sorted<TDeclaration>(
    contributions: ContributionMap<TDeclaration>
  ): readonly PluginContributionSnapshot<TDeclaration>[] {
    return Array.from(contributions.values()).sort((left, right) =>
      left.key.localeCompare(right.key)
    );
  }
}
