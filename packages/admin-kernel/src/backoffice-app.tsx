import { useActionState, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminShell, Badge, Button, Card } from "@trinacria-cms/admin-ui";
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
  const [installationStatus, setInstallationStatus] = useState<InstallationStatus | null>(null);
  const [bootstrapError, setBootstrapError] = useState<SdkErrorDetails | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [isBootstrappingApp, setIsBootstrappingApp] = useState(true);
  const [isShellLoading, setIsShellLoading] = useState(false);
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

  async function handleLogout() {
    try {
      await cms.auth.logoutSession();
    } catch {
      // Ignore logout transport failures: local cleanup still matters.
    }
    clearBackofficeSession();
    setAuthUser(null);
    navigateTo("dashboard", setActiveRouteId);
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
      headerActions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="hidden rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-4 py-2 text-sm text-[color:var(--color-ink-muted)] md:block">
            <span className="font-semibold text-[color:var(--color-ink)]">
              {authUser.displayName}
            </span>
            <span className="mx-2 text-[color:var(--color-ink-subtle)]">/</span>
            <span>{authUser.email}</span>
          </div>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            {t("backoffice.shell.refresh")}
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            {t("backoffice.shell.sign_out")}
          </Button>
        </div>
      }
      statusBadges={[
        {
          label: "Runtime",
          value: health?.status ?? (isShellLoading ? "loading" : "unknown"),
          tone: health?.status === "ok" ? "success" : health ? "warning" : "default"
        },
        {
          label: "Plugins",
          value: String(health?.runtime.totalPlugins ?? runtimePlugins.length),
          tone: "default"
        },
        {
          label: "Visible routes",
          value: String(registry.routes.length),
          tone: "default"
        },
        {
          label: "Session",
          value: authUser.status,
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
