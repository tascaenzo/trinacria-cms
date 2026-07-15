import { useEffect, useMemo, useState } from "react";
import type { GetAuthenticatedUserResponse, GetKernelHealthResponse } from "@trinacria-cms/sdk";
import type { AdminExtensionManifest, AdminRuntimePluginInfo } from "../contracts.js";
import {
  createOfficialAdminContributions,
  withOfficialAdminRouteRenderers
} from "../contributions/official-admin-contributions.js";
import type { TranslateFn } from "../lib/i18n.js";
import { toDisplayError } from "../lib/sdk-errors.js";
import type { BackofficeModule } from "../module.js";
import { normalizeSafeAdminExtensionManifests } from "../runtime/admin-extension-manifest.js";
import { buildAdminRegistry } from "../runtime/admin-route-runtime.js";
import { cms } from "../runtime/cms-sdk.js";
import { loadRuntimeDiscovery } from "../runtime/runtime-discovery.js";

type AuthenticatedUser = GetAuthenticatedUserResponse["data"];
type HealthSnapshot = GetKernelHealthResponse;

export function useBackofficeShellRuntime({
  authUser,
  installationInstalled,
  modules,
  t
}: {
  authUser: AuthenticatedUser | null;
  installationInstalled: boolean;
  modules: readonly BackofficeModule[];
  t: TranslateFn;
}) {
  const [runtimePlugins, setRuntimePlugins] = useState<readonly AdminRuntimePluginInfo[]>([]);
  const [runtimeManifests, setRuntimeManifests] = useState<readonly AdminExtensionManifest[]>([]);
  const [userPermissionKeys, setUserPermissionKeys] = useState<readonly string[]>([]);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [isShellLoading, setIsShellLoading] = useState(false);

  useEffect(() => {
    if (!installationInstalled || !authUser) {
      setRuntimePlugins([]);
      setRuntimeManifests([]);
      setUserPermissionKeys([]);
      setHealth(null);
      setShellError(null);
      return;
    }

    const authenticatedUser = authUser;
    let isMounted = true;

    async function loadShellData() {
      setIsShellLoading(true);
      setShellError(null);
      const [discoveryResult, healthResult, permissionsResult] = await Promise.allSettled([
        loadRuntimeDiscovery(),
        cms.kernelHealth.getKernelHealth(),
        cms.security.listUserEffectivePermissions({ path: { id: authenticatedUser.id } })
      ]);

      if (!isMounted) {
        return;
      }

      const blockingErrors: string[] = [];

      if (discoveryResult.status === "fulfilled") {
        setRuntimePlugins(discoveryResult.value.plugins);
        setRuntimeManifests(discoveryResult.value.manifests);
      } else {
        setRuntimePlugins([]);
        setRuntimeManifests([]);
        blockingErrors.push(toDisplayError(discoveryResult.reason));
      }

      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value);
      } else {
        setHealth(null);
        blockingErrors.push(toDisplayError(healthResult.reason));
      }

      if (permissionsResult.status === "fulfilled") {
        setUserPermissionKeys(permissionsResult.value.data);
      } else {
        setUserPermissionKeys([]);
      }

      if (blockingErrors.length > 0) {
        setShellError(blockingErrors.join(" "));
      }

      setIsShellLoading(false);
    }

    void loadShellData();

    return () => {
      isMounted = false;
    };
  }, [authUser, installationInstalled]);

  const customContributions = useMemo(
    () =>
      withOfficialAdminRouteRenderers(
        modules.flatMap((module) => [
          ...(module.contributions ?? []),
          ...normalizeSafeAdminExtensionManifests(module.manifests ?? [])
        ])
      ),
    [modules]
  );

  const runtimeContributions = useMemo(
    () => withOfficialAdminRouteRenderers(normalizeSafeAdminExtensionManifests(runtimeManifests)),
    [runtimeManifests]
  );

  const rendererRegistry = useMemo(
    () => ({
      dashboardWidgets: new Map(
        modules.flatMap((module) => Object.entries(module.renderers?.dashboardWidgets ?? {}))
      ),
      settingsSections: new Map(
        modules.flatMap((module) => Object.entries(module.renderers?.settingsSections ?? {}))
      )
    }),
    [modules]
  );

  const registry = useMemo(() => {
    return buildAdminRegistry(
      [
        ...createOfficialAdminContributions({
          pluginCount: runtimePlugins.length,
          capabilityCount: runtimePlugins.reduce(
            (total, plugin) => total + plugin.capabilities.length,
            0
          ),
          systemStateLabel: health?.status ?? "unknown"
        }),
        ...customContributions,
        ...runtimeContributions
      ],
      runtimePlugins,
      t,
      userPermissionKeys,
      rendererRegistry
    );
  }, [
    customContributions,
    health?.status,
    rendererRegistry,
    runtimeContributions,
    runtimePlugins,
    t,
    userPermissionKeys
  ]);

  const capabilityIndex = useMemo(
    () => new Map(runtimePlugins.map((plugin) => [plugin.pluginId, new Set(plugin.capabilities)])),
    [runtimePlugins]
  );
  const canCustomizeDashboard = useMemo(
    () => userPermissionKeys.some((permission) => matchesPermission(permission, "core-pack:settings:write")),
    [userPermissionKeys]
  );

  return {
    capabilityIndex,
    canCustomizeDashboard,
    isShellLoading,
    registry,
    runtimePlugins,
    shellError
  };
}

function matchesPermission(grantedPermission: string, requiredPermission: string): boolean {
  const grantedParts = grantedPermission.trim().toLowerCase().split(":");
  const requiredParts = requiredPermission.trim().toLowerCase().split(":");
  return (
    grantedParts.length === requiredParts.length &&
    grantedParts.every((part, index) => part === "*" || part === requiredParts[index])
  );
}
