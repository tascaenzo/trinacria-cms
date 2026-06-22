import { useActionState, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AdminShell,
  Card,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Icon,
  SearchField
} from "@trinacria-cms/trinacria-ui";
import type { AdminExtensionManifest, AdminRuntimePluginInfo } from "./contracts.js";
import type {
  GetAuthenticatedUserResponse,
  GetKernelHealthResponse,
  GetInstallationStatusResponse,
  LoginWithPasswordResponse
} from "@trinacria-cms/sdk";
import {
  createOfficialAdminContributions,
  withOfficialAdminRouteRenderers
} from "./contributions/official-admin-contributions.js";
import {
  getLocalizedInstallationError,
  getLocalizedLoginError,
  normalizeLocale,
  officialI18nBundle,
  persistBackofficeLocale,
  readBackofficeLocale,
  type SupportedLocale
} from "./lib/auth-i18n.js";
import { I18nProvider, createTranslate, type I18nBundle } from "./lib/i18n.js";
import { getSdkErrorDetails, toDisplayError, type SdkErrorDetails } from "./lib/sdk-errors.js";
import { formatUserName } from "./lib/user-formatting.js";
import { AuthScreenLayout } from "./components/auth-screen-layout.js";
import type { BackofficeModule } from "./module.js";
import { readRequiredString } from "./runtime/action-state.js";
import { normalizeSafeAdminExtensionManifests } from "./runtime/admin-extension-manifest.js";
import { buildAdminRegistry } from "./runtime/admin-route-runtime.js";
import { clearBackofficeSession, persistBackofficeSession } from "./runtime/auth-session.js";
import {
  getBackofficeNavigationEventName,
  readBackofficeNavigationState,
  writeBackofficeNavigationState
} from "./runtime/backoffice-navigation-state.js";
import { cms } from "./runtime/cms-sdk.js";
import { loadRuntimeDiscovery } from "./runtime/runtime-discovery.js";
import { InstallationDatabaseGuidePage } from "./pages/installation-database-guide-page.js";
import { InstallationBootstrapPage } from "./pages/installation-bootstrap-page.js";
import { LoginPage } from "./pages/login-page.js";

type AuthenticatedUser = GetAuthenticatedUserResponse["data"];
type HealthSnapshot = GetKernelHealthResponse;
type InstallationStatus = GetInstallationStatusResponse["data"] & {
  envFilePresent?: boolean;
  dbConfigured?: boolean;
  envFilePath?: string;
};
type FormActionState<T> = {
  ok: boolean;
  error: SdkErrorDetails | null;
  data: T | null;
};
type LoginActionState = FormActionState<LoginWithPasswordResponse["data"]>;
type InstallationActionState = FormActionState<LoginWithPasswordResponse["data"]>;

const USER_MENU_NAVIGATION_IDS = ["nav-settings", "nav-api-keys"] as const;

export interface BackofficeAppProps {
  modules?: readonly BackofficeModule[];
}

function createIdleFormActionState<T>(): FormActionState<T> {
  return {
    ok: false,
    error: null,
    data: null
  };
}

/**
 * BackofficeApp centralizes runtime discovery, session bootstrap, and module
 * composition so host apps only provide initialization options.
 */
export function BackofficeApp({ modules = [] }: BackofficeAppProps) {
  const [locale, setLocale] = useState<SupportedLocale>(() => readBackofficeLocale());
  const [activeRouteId, setActiveRouteId] = useState<string>(
    readBackofficeNavigationState().routeId ?? "dashboard"
  );
  const [runtimePlugins, setRuntimePlugins] = useState<readonly AdminRuntimePluginInfo[]>([]);
  const [runtimeManifests, setRuntimeManifests] = useState<readonly AdminExtensionManifest[]>([]);
  const [userPermissionKeys, setUserPermissionKeys] = useState<readonly string[]>([]);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [authRoleLabel, setAuthRoleLabel] = useState<string | null>(null);
  const [installationStatus, setInstallationStatus] = useState<InstallationStatus | null>(null);
  const [bootstrapError, setBootstrapError] = useState<SdkErrorDetails | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [isBootstrappingApp, setIsBootstrappingApp] = useState(true);
  const [isShellLoading, setIsShellLoading] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const translationBundles = useMemo<readonly I18nBundle[]>(
    () => [officialI18nBundle, ...modules.flatMap((module) => module.i18n ?? [])],
    [modules]
  );
  const t = useMemo(
    () => createTranslate(locale, translationBundles, "en"),
    [locale, translationBundles]
  );
  const handleLocaleChange = useCallback((nextLocale: string) => {
    setLocale(normalizeLocale(nextLocale));
  }, []);

  useEffect(() => {
    if (authUser) {
      document.documentElement.classList.remove("auth-page");
    }
  }, [authUser]);

  useEffect(() => {
    function handleAuthenticatedUserUpdate(event: Event) {
      const nextUser = (event as CustomEvent<AuthenticatedUser>).detail;
      if (nextUser?.id) {
        setAuthUser(nextUser);
      }
    }

    window.addEventListener("trinacria-cms:auth-user-updated", handleAuthenticatedUserUpdate);
    return () =>
      window.removeEventListener("trinacria-cms:auth-user-updated", handleAuthenticatedUserUpdate);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    persistBackofficeLocale(locale);
  }, [locale]);

  useEffect(() => {
    function handleNavigationChange() {
      setActiveRouteId(readBackofficeNavigationState().routeId ?? "dashboard");
    }

    const navigationEventName = getBackofficeNavigationEventName();
    window.addEventListener(navigationEventName, handleNavigationChange);
    window.addEventListener("popstate", handleNavigationChange);
    return () => {
      window.removeEventListener(navigationEventName, handleNavigationChange);
      window.removeEventListener("popstate", handleNavigationChange);
    };
  }, []);

  const completeLogin = useCallback((response: LoginWithPasswordResponse["data"]) => {
    persistBackofficeSession({
      expiresAt: response.expiresAt
    });
    setAuthUser(response.user);
    navigateTo("dashboard", setActiveRouteId);
  }, []);

  const [loginState, submitLogin, isLoggingIn] = useActionState<LoginActionState, FormData>(
    async (_previousState, formData) => {
      try {
        const response = await cms.auth.loginWithPassword({
          body: {
            email: readRequiredString(formData, "email"),
            password: readRequiredString(formData, "password")
          }
        });

        return {
          ok: true,
          error: null,
          data: response.data
        };
      } catch (currentError) {
        return {
          ok: false,
          error: getSdkErrorDetails(currentError),
          data: null
        };
      }
    },
    createIdleFormActionState<LoginWithPasswordResponse["data"]>()
  );

  const [installationActionState, submitInstallation, isInstalling] = useActionState<
    InstallationActionState,
    FormData
  >(async (_previousState, formData) => {
    try {
      const email = readRequiredString(formData, "email");
      const password = readRequiredString(formData, "password");

      await cms.installation.bootstrapInstallation({
        body: {
          firstName: readRequiredString(formData, "firstName"),
          lastName: readRequiredString(formData, "lastName"),
          email,
          password,
          confirmPassword: readRequiredString(formData, "confirmPassword"),
          siteName: readRequiredString(formData, "siteName"),
          siteTagline: formData.get("siteTagline")?.toString() || undefined,
          locale: formData.get("locale")?.toString() || undefined,
          timezone: formData.get("timezone")?.toString() || undefined
        }
      });

      const loginResponse = await cms.auth.loginWithPassword({
        body: {
          email,
          password
        }
      });

      return {
        ok: true,
        error: null,
        data: loginResponse.data
      };
    } catch (currentError) {
      return {
        ok: false,
        error: getSdkErrorDetails(currentError),
        data: null
      };
    }
  }, createIdleFormActionState<LoginWithPasswordResponse["data"]>());

  useEffect(() => {
    if (!loginState.ok || !loginState.data) {
      return;
    }

    completeLogin(loginState.data);
  }, [completeLogin, loginState]);

  useEffect(() => {
    if (!installationActionState.ok || !installationActionState.data) {
      return;
    }

    setInstallationStatus((previous) => ({
      installed: true,
      envFilePresent: previous?.envFilePresent ?? true,
      dbConfigured: previous?.dbConfigured ?? true,
      envFilePath: previous?.envFilePath ?? ".env",
      installedAt: previous?.installedAt,
      adminUserId: previous?.adminUserId
    }));
    completeLogin(installationActionState.data);
  }, [completeLogin, installationActionState]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapApp() {
      setIsBootstrappingApp(true);
      setBootstrapError(null);
      try {
        const installation = await cms.installation.getInstallationStatus();
        if (!isMounted) {
          return;
        }
        setInstallationStatus(installation.data);

        if (!installation.data.installed) {
          clearBackofficeSession();
          setAuthUser(null);
          return;
        }

        try {
          const response = await cms.auth.getAuthenticatedUser();
          if (isMounted) {
            setAuthUser(response.data);
          }
        } catch {
          if (isMounted) {
            clearBackofficeSession();
            setAuthUser(null);
          }
        }
      } catch (currentError) {
        if (isMounted) {
          setBootstrapError(getSdkErrorDetails(currentError));
          clearBackofficeSession();
          setAuthUser(null);
        }
      } finally {
        if (isMounted) {
          setIsBootstrappingApp(false);
        }
      }
    }

    void bootstrapApp();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!installationStatus?.installed || !authUser) {
      setRuntimePlugins([]);
      setRuntimeManifests([]);
      setUserPermissionKeys([]);
      setHealth(null);
      setShellError(null);
      setAuthRoleLabel(null);
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
  }, [authUser, installationStatus?.installed]);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthenticatedUserRole() {
      if (!authUser) {
        setAuthRoleLabel(null);
        return;
      }

      try {
        const response = await cms.security.listUserRoles({
          path: { id: authUser.id }
        });
        if (!isMounted) {
          return;
        }
        const primaryRole = response.data[0]?.roleCode ?? null;
        setAuthRoleLabel(
          primaryRole ? formatRoleLabel(primaryRole) : t("backoffice.user.role_fallback")
        );
      } catch {
        if (isMounted) {
          setAuthRoleLabel(t("backoffice.user.role_fallback"));
        }
      }
    }

    void loadAuthenticatedUserRole();

    return () => {
      isMounted = false;
    };
  }, [authUser, t]);

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
      userPermissionKeys
    );
  }, [
    customContributions,
    health?.status,
    runtimeContributions,
    runtimePlugins,
    t,
    userPermissionKeys
  ]);

  useEffect(() => {
    const fallbackRouteId = registry.routes[0]?.id;
    if (
      fallbackRouteId &&
      activeRouteId !== fallbackRouteId &&
      !registry.routes.some((route) => route.id === activeRouteId)
    ) {
      navigateTo(fallbackRouteId, setActiveRouteId);
    }
  }, [activeRouteId, registry.routes]);

  const capabilityIndex = useMemo(
    () => new Map(runtimePlugins.map((plugin) => [plugin.pluginId, new Set(plugin.capabilities)])),
    [runtimePlugins]
  );

  const activeRoute =
    registry.routes.find((route) => route.id === activeRouteId) ?? registry.routes[0] ?? null;
  const isProfileRoute = activeRoute?.id === "profile";
  const shouldShowShellDiscoveryState = !isProfileRoute;
  const shouldRenderContent = isProfileRoute || (!isShellLoading && !shellError);
  const loginErrorMessage =
    getLocalizedLoginError(loginState.error, t) ?? getLocalizedLoginError(bootstrapError, t);
  const installationErrorMessage =
    getLocalizedInstallationError(installationActionState.error, t) ??
    getLocalizedInstallationError(bootstrapError, t);

  function handleLogout() {
    clearBackofficeSession();
    setAuthUser(null);
    setAuthRoleLabel(null);
    setIsUserMenuOpen(false);
    navigateTo("dashboard", setActiveRouteId);
  }

  function renderWithI18n(node: ReactNode) {
    return (
      <I18nProvider
        value={{
          locale,
          setLocale: handleLocaleChange,
          t
        }}
      >
        {node}
      </I18nProvider>
    );
  }

  if (isBootstrappingApp) {
    return renderWithI18n(
      <div className="min-h-screen bg-[color:var(--color-canvas)] px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Card
            eyebrow={t("auth.installation.eyebrow")}
            title={t("backoffice.shell.preparing_title")}
          >
            <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">
              {t("backoffice.shell.preparing_body")}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (bootstrapError) {
    return renderWithI18n(
      <AuthScreenLayout
        variant="minimal"
        eyebrow={t("auth.installation.eyebrow")}
        heroTitle={t("auth.installation.error.communication_title")}
        heroBody={t("auth.installation.error.communication_body")}
        formTitle={t("auth.installation.error.communication_form_title")}
        formSummary={bootstrapError.message ?? ""}
        formBadgeLabel={t("auth.installation.form_badge_label")}
        formBadgeHint={t("auth.installation.form_badge_hint")}
        heroMetrics={[]}
        heroHighlights={[]}
      >
        <div className="grid gap-4 text-sm text-[color:var(--color-ink-muted)]">
          <p>{t("auth.installation.error.communication_detail")}</p>
        </div>
      </AuthScreenLayout>
    );
  }

  if (installationStatus && !installationStatus.installed) {
    const requiresDatabaseGuide =
      !installationStatus.envFilePresent || !installationStatus.dbConfigured;
    if (requiresDatabaseGuide) {
      return renderWithI18n(
        <InstallationDatabaseGuidePage envFilePath={installationStatus.envFilePath ?? ".env"} />
      );
    }

    return renderWithI18n(
      <InstallationBootstrapPage
        action={submitInstallation}
        isSubmitting={isInstalling}
        state={{
          error: installationErrorMessage
        }}
      />
    );
  }

  if (!authUser) {
    return renderWithI18n(
      <LoginPage
        action={submitLogin}
        isSubmitting={isLoggingIn}
        state={{
          error: loginErrorMessage
        }}
      />
    );
  }

  const userName = formatUserName(authUser);
  const hasSettingsRoute = registry.routes.some((route) => route.id === "settings");
  const hasApiKeysRoute = registry.routes.some((route) => route.id === "api-keys");

  const content = activeRoute
    ? activeRoute.render({
        route: activeRoute,
        routes: registry.routes,
        runtimePlugins,
        capabilityIndex,
        resources: registry.resources,
        settings: registry.settings,
        widgets: registry.widgets,
        locale,
        t
      })
    : null;

  return renderWithI18n(
    <AdminShell
      activeRouteId={activeRoute?.id ?? ""}
      navigation={registry.navigation}
      hiddenNavigationIds={USER_MENU_NAVIGATION_IDS}
      onNavigate={(routeId) => navigateTo(routeId, setActiveRouteId)}
      title={activeRoute?.title ?? t("backoffice.shell.title")}
      subtitle={activeRoute?.summary ?? t("backoffice.shell.subtitle")}
      hideHeader
      sidebarFooter={
        <DropdownMenu
          open={isUserMenuOpen}
          onOpenChange={setIsUserMenuOpen}
          side="top"
          align="end"
          className="w-full"
          contentClassName="w-full min-w-0"
          trigger={
            <button
              type="button"
              className="flex w-full min-w-0 items-center gap-3 rounded-md px-2.5 py-2 text-left transition hover:bg-[color:var(--color-interactive-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-focus)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-action-primary-bg)] text-[color:var(--color-action-primary-ink)]">
                <Icon name="user-round" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[color:var(--color-ink)]">
                  {userName}
                </span>
                <span className="block truncate text-xs text-[color:var(--color-ink-subtle)]">
                  {authRoleLabel ?? t("backoffice.user.role_loading")}
                </span>
              </span>
              <Icon
                name="chevron-down"
                className={`h-4 w-4 shrink-0 text-[color:var(--color-ink-subtle)] transition ${isUserMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
          }
        >
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-semibold normal-case tracking-normal text-[color:var(--color-ink)]">
              {userName}
            </span>
            <span className="block truncate pt-1 text-xs font-normal normal-case tracking-normal text-[color:var(--color-ink-subtle)]">
              {authRoleLabel ?? t("backoffice.user.role_loading")}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuItem
            icon="user-round"
            title={t("backoffice.user.menu.profile")}
            onClick={() => navigateTo("profile", setActiveRouteId)}
          />
          {hasSettingsRoute ? (
            <DropdownMenuItem
              icon="settings-2"
              title={t("backoffice.user.menu.settings")}
              onClick={() => navigateTo("settings", setActiveRouteId)}
            />
          ) : null}
          {hasApiKeysRoute ? (
            <DropdownMenuItem
              icon="key-round"
              title={t("backoffice.user.menu.api_keys")}
              onClick={() => navigateTo("api-keys", setActiveRouteId)}
            />
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            icon="log-out"
            title={t("backoffice.user.menu.logout")}
            tone="danger"
            onClick={handleLogout}
          />
        </DropdownMenu>
      }
      headerActions={
        <div className="hidden md:flex md:w-[320px] lg:w-[360px]">
          <SearchField placeholder={t("backoffice.shell.search_placeholder")} />
        </div>
      }
    >
      {shellError && shouldShowShellDiscoveryState ? (
        <Card
          eyebrow={t("auth.installation.eyebrow")}
          title={t("backoffice.shell.discovery_error_title")}
        >
          <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">{shellError}</p>
        </Card>
      ) : null}
      {isShellLoading && !shellError && shouldShowShellDiscoveryState ? (
        <Card
          eyebrow={t("auth.installation.eyebrow")}
          title={t("backoffice.shell.loading_discovery_title")}
        >
          <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">
            {t("backoffice.shell.loading_discovery_body")}
          </p>
        </Card>
      ) : null}
      {shouldRenderContent ? content : null}
    </AdminShell>
  );
}

function navigateTo(routeId: string, setActiveRouteId: (routeId: string) => void) {
  writeBackofficeNavigationState(routeId);
  setActiveRouteId(routeId);
}

function formatRoleLabel(roleCode: string): string {
  return roleCode
    .trim()
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
