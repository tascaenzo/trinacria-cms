import { useActionState, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AdminShell, Badge, Card, Icon } from "@trinacria-cms/admin-ui";
import type { AdminRuntimePluginInfo } from "./contracts.js";
import type {
  GetAuthenticatedUserResponse,
  GetInstallationStatusResponse,
  LoginWithPasswordResponse
} from "@trinacria-cms/sdk";
import { createOfficialAdminContributions } from "./contributions/official-admin-contributions.js";
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
import { translateStatusLabel, translateSystemStateLabel } from "./lib/ui-translations.js";
import type { BackofficeModule } from "./module.js";
import { readRequiredString } from "./runtime/action-state.js";
import { buildAdminRegistry } from "./runtime/admin-route-runtime.js";
import { clearBackofficeSession, persistBackofficeSession } from "./runtime/auth-session.js";
import { cms } from "./runtime/cms-sdk.js";
import { loadRuntimePluginInfo } from "./runtime/runtime-discovery.js";
import { InstallationBootstrapPage } from "./pages/installation-bootstrap-page.js";
import { LoginPage } from "./pages/login-page.js";

interface HealthSnapshot {
  status: string;
  runtime: {
    totalPlugins: number;
  };
}

type AuthenticatedUser = GetAuthenticatedUserResponse["data"];
type InstallationStatus = GetInstallationStatusResponse["data"];
type FormActionState<T> = {
  ok: boolean;
  error: SdkErrorDetails | null;
  data: T | null;
};
type LoginActionState = FormActionState<LoginWithPasswordResponse["data"]>;

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
  const [activeRouteId, setActiveRouteId] = useState<string>(readHashRoute() ?? "dashboard");
  const [runtimePlugins, setRuntimePlugins] = useState<readonly AdminRuntimePluginInfo[]>([]);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [authRoleLabel, setAuthRoleLabel] = useState<string | null>(null);
  const [installationStatus, setInstallationStatus] = useState<InstallationStatus | null>(null);
  const [bootstrapError, setBootstrapError] = useState<SdkErrorDetails | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [isBootstrappingApp, setIsBootstrappingApp] = useState(true);
  const [isShellLoading, setIsShellLoading] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
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
    if (!isUserMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!userMenuRef.current?.contains(target)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    document.documentElement.lang = locale;
    persistBackofficeLocale(locale);
  }, [locale]);

  useEffect(() => {
    function handleHashChange() {
      setActiveRouteId(readHashRoute() ?? "dashboard");
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const completeLogin = useCallback((response: LoginWithPasswordResponse["data"]) => {
    persistBackofficeSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: response.expiresAt,
      refreshExpiresAt: response.refreshExpiresAt
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
    LoginActionState,
    FormData
  >(async (_previousState, formData) => {
    try {
      const email = readRequiredString(formData, "email");
      const password = readRequiredString(formData, "password");

      await cms.installation.bootstrapInstallation({
        body: {
          email,
          displayName: readRequiredString(formData, "displayName"),
          password
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

    setInstallationStatus({ installed: true });
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
      setHealth(null);
      setShellError(null);
      setAuthRoleLabel(null);
      return;
    }

    let isMounted = true;

    async function loadShellData() {
      setIsShellLoading(true);
      setShellError(null);
      try {
        const [plugins, healthSnapshot] = await Promise.all([
          loadRuntimePluginInfo(),
          cms.kernelHealth.getKernelHealth() as Promise<HealthSnapshot>
        ]);
        if (!isMounted) {
          return;
        }
        setRuntimePlugins(plugins);
        setHealth(healthSnapshot);
      } catch (currentError) {
        if (!isMounted) {
          return;
        }
        setShellError(toDisplayError(currentError));
      } finally {
        if (isMounted) {
          setIsShellLoading(false);
        }
      }
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
        setAuthRoleLabel(primaryRole ? formatRoleLabel(primaryRole) : t("backoffice.user.role_fallback"));
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
    () => modules.flatMap((module) => module.contributions),
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
        ...customContributions
      ],
      runtimePlugins,
      t
    );
  }, [customContributions, health?.status, runtimePlugins, t]);

  useEffect(() => {
    if (!registry.routes.some((route) => route.id === activeRouteId) && registry.routes[0]) {
      navigateTo(registry.routes[0].id, setActiveRouteId);
    }
  }, [activeRouteId, registry.routes]);

  const capabilityIndex = useMemo(
    () => new Map(runtimePlugins.map((plugin) => [plugin.pluginId, new Set(plugin.capabilities)])),
    [runtimePlugins]
  );

  const activeRoute =
    registry.routes.find((route) => route.id === activeRouteId) ?? registry.routes[0] ?? null;
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

  if (installationStatus && !installationStatus.installed) {
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

  const displayName = authUser.displayName;

  const content = activeRoute
    ? activeRoute.render({
        route: activeRoute,
        runtimePlugins,
        capabilityIndex,
        locale,
        t
      })
    : null;

  return renderWithI18n(
    <AdminShell
      activeRouteId={activeRoute?.id ?? ""}
      navigation={registry.navigation}
      onNavigate={(routeId) => navigateTo(routeId, setActiveRouteId)}
      title={activeRoute?.title ?? t("backoffice.shell.title")}
      subtitle={activeRoute?.summary ?? t("backoffice.shell.subtitle")}
      sidebarFooter={
        <div ref={userMenuRef} className="relative">
          {isUserMenuOpen ? (
            <div className="absolute inset-x-0 bottom-full z-30 mb-2 rounded-2xl border border-[color:var(--color-border)] bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
              <div className="border-b border-[color:var(--color-border)] px-3 pb-2 pt-1">
                <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">{displayName}</p>
                <p className="truncate text-xs text-[color:var(--color-ink-subtle)]">
                  {authRoleLabel ?? t("backoffice.user.role_loading")}
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigateTo("settings", setActiveRouteId);
                    setIsUserMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-ink-muted)] transition hover:bg-slate-50 hover:text-[color:var(--color-ink)]"
                >
                  <Icon name="user-round" />
                  <span>{t("backoffice.user.menu.profile")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigateTo("settings", setActiveRouteId);
                    setIsUserMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-ink-muted)] transition hover:bg-slate-50 hover:text-[color:var(--color-ink)]"
                >
                  <Icon name="settings-2" />
                  <span>{t("backoffice.user.menu.settings")}</span>
                </button>
                <div className="my-2 border-t border-[color:var(--color-border)]" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                >
                  <Icon name="log-out" />
                  <span>{t("backoffice.user.menu.logout")}</span>
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setIsUserMenuOpen((current) => !current)}
            className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
              <Icon name="user-round" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[color:var(--color-ink)]">
                {displayName}
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
        </div>
      }
      headerActions={
        <div className="hidden md:flex md:w-[320px] lg:w-[360px]">
          <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-white px-3 text-sm text-[color:var(--color-ink-subtle)] shadow-sm transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-200">
            <Icon name="search" className="h-4 w-4 text-[color:var(--color-ink-subtle)]" />
            <input
              type="search"
              placeholder={t("backoffice.shell.search_placeholder")}
              className="w-full border-0 bg-transparent text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)]"
            />
          </label>
        </div>
      }
      statusBadges={[
        {
          label: t("backoffice.shell.stats.runtime"),
          value: translateSystemStateLabel(
            health?.status ?? (isShellLoading ? "loading" : "unknown"),
            t
          ),
          tone: health?.status === "ok" ? "success" : health ? "warning" : "default"
        },
        {
          label: t("backoffice.shell.stats.plugins"),
          value: String(health?.runtime.totalPlugins ?? runtimePlugins.length),
          tone: "default"
        },
        {
          label: t("backoffice.shell.stats.visible_routes"),
          value: String(registry.routes.length),
          tone: "default"
        },
        {
          label: t("backoffice.shell.stats.session"),
          value: translateStatusLabel(authUser.status, t),
          tone: authUser.status === "active" ? "success" : "warning"
        }
      ]}
    >
      {shellError ? (
        <Card
          eyebrow={t("auth.installation.eyebrow")}
          title={t("backoffice.shell.discovery_error_title")}
        >
          <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">{shellError}</p>
        </Card>
      ) : null}
      {isShellLoading && !shellError ? (
        <Card
          eyebrow={t("auth.installation.eyebrow")}
          title={t("backoffice.shell.loading_discovery_title")}
        >
          <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">
            {t("backoffice.shell.loading_discovery_body")}
          </p>
        </Card>
      ) : null}
      {!isShellLoading && !shellError ? content : null}
      {customContributions.length > 0 ? (
        <div className="mt-4">
          <Badge>{t("backoffice.shell.custom_modules_enabled")}</Badge>
        </div>
      ) : null}
    </AdminShell>
  );
}

function readHashRoute(): string | null {
  const hash = window.location.hash.replace(/^#/, "").trim();
  return hash ? hash : null;
}

function navigateTo(routeId: string, setActiveRouteId: (routeId: string) => void) {
  window.location.hash = routeId;
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
