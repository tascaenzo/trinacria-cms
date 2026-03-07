import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell, Badge, Button, Card } from "@trinacria-cms/admin-ui";
import type { AdminRuntimePluginInfo } from "./contracts.js";
import type {
  GetAuthenticatedUserResponse,
  GetInstallationStatusResponse,
  LoginWithPasswordResponse,
} from "@trinacria-cms/sdk";
import { createOfficialAdminContributions } from "./contributions/official-admin-contributions.js";
import { toDisplayError } from "./lib/sdk-errors.js";
import type { BackofficeModule } from "./module.js";
import {
  createIdleAsyncActionState,
  readRequiredString,
  type AsyncActionState,
} from "./runtime/action-state.js";
import { buildAdminRegistry } from "./runtime/admin-route-runtime.js";
import {
  clearBackofficeSession,
  persistBackofficeSession,
} from "./runtime/auth-session.js";
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
type LoginActionState = AsyncActionState<LoginWithPasswordResponse["data"]>;

export interface BackofficeAppProps {
  modules?: readonly BackofficeModule[];
}

/**
 * BackofficeApp centralizes runtime discovery, session bootstrap, and module
 * composition so host apps only provide initialization options.
 */
export function BackofficeApp({ modules = [] }: BackofficeAppProps) {
  const [activeRouteId, setActiveRouteId] = useState<string>(readHashRoute() ?? "dashboard");
  const [runtimePlugins, setRuntimePlugins] = useState<readonly AdminRuntimePluginInfo[]>([]);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [installationStatus, setInstallationStatus] = useState<InstallationStatus | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [isBootstrappingApp, setIsBootstrappingApp] = useState(true);
  const [isShellLoading, setIsShellLoading] = useState(false);

  useEffect(() => {
    if (authUser) {
      document.documentElement.classList.remove("auth-page");
    }
  }, [authUser]);

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
      refreshExpiresAt: response.refreshExpiresAt,
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
            password: readRequiredString(formData, "password"),
          },
        });

        return {
          ok: true,
          error: null,
          data: response.data,
        };
      } catch (currentError) {
        return {
          ok: false,
          error: toDisplayError(currentError),
          data: null,
        };
      }
    },
    createIdleAsyncActionState<LoginWithPasswordResponse["data"]>(),
  );

  const [installationActionState, submitInstallation, isInstalling] = useActionState<
    LoginActionState,
    FormData
  >(
    async (_previousState, formData) => {
      try {
        const email = readRequiredString(formData, "email");
        const password = readRequiredString(formData, "password");

        await cms.installation.bootstrapInstallation({
          body: {
            email,
            displayName: readRequiredString(formData, "displayName"),
            password,
          },
        });

        const loginResponse = await cms.auth.loginWithPassword({
          body: {
            email,
            password,
          },
        });

        return {
          ok: true,
          error: null,
          data: loginResponse.data,
        };
      } catch (currentError) {
        return {
          ok: false,
          error: toDisplayError(currentError),
          data: null,
        };
      }
    },
    createIdleAsyncActionState<LoginWithPasswordResponse["data"]>(),
  );

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
          setBootstrapError(toDisplayError(currentError));
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
          cms.kernelHealth.getKernelHealth() as Promise<HealthSnapshot>,
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
    [modules],
  );

  const registry = useMemo(() => {
    return buildAdminRegistry(
      [
        ...createOfficialAdminContributions({
          pluginCount: runtimePlugins.length,
          capabilityCount: runtimePlugins.reduce(
            (total, plugin) => total + plugin.capabilities.length,
            0,
          ),
          systemStateLabel: health?.status ?? "unknown",
        }),
        ...customContributions,
      ],
      runtimePlugins,
    );
  }, [customContributions, health?.status, runtimePlugins]);

  useEffect(() => {
    if (!registry.routes.some((route) => route.id === activeRouteId) && registry.routes[0]) {
      navigateTo(registry.routes[0].id, setActiveRouteId);
    }
  }, [activeRouteId, registry.routes]);

  const capabilityIndex = useMemo(
    () => new Map(runtimePlugins.map((plugin) => [plugin.pluginId, new Set(plugin.capabilities)])),
    [runtimePlugins],
  );

  const activeRoute =
    registry.routes.find((route) => route.id === activeRouteId) ?? registry.routes[0] ?? null;

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
    return (
      <div className="min-h-screen bg-[color:var(--color-canvas)] px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Card eyebrow="Bootstrap" title="Preparing backoffice state">
            <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">
              Checking installation status and restoring the current CMS session.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (installationStatus && !installationStatus.installed) {
    return (
      <InstallationBootstrapPage
        action={submitInstallation}
        isSubmitting={isInstalling}
        state={installationActionState.error ? installationActionState : {
          ok: false,
          error: bootstrapError,
          data: null,
        }}
      />
    );
  }

  if (!authUser) {
    return (
      <LoginPage
        action={submitLogin}
        isSubmitting={isLoggingIn}
        state={loginState.error ? loginState : { ok: false, error: bootstrapError, data: null }}
      />
    );
  }

  const content = activeRoute
    ? activeRoute.render({
        route: activeRoute,
        runtimePlugins,
        capabilityIndex,
      })
    : null;

  return (
    <AdminShell
      activeRouteId={activeRoute?.id ?? ""}
      navigation={registry.navigation}
      onNavigate={(routeId) => navigateTo(routeId, setActiveRouteId)}
      title={activeRoute?.title ?? "Backoffice"}
      subtitle={
        activeRoute?.summary ??
        "Modular admin shell for plugin-driven operations, designed to grow route by route."
      }
      headerActions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="hidden rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-panel)] px-4 py-2 text-sm text-[color:var(--color-ink-muted)] md:block">
            <span className="font-semibold text-[color:var(--color-ink)]">{authUser.displayName}</span>
            <span className="mx-2 text-[color:var(--color-ink-subtle)]">/</span>
            <span>{authUser.email}</span>
          </div>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Refresh shell
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      }
      statusBadges={[
        {
          label: "Runtime",
          value: health?.status ?? (isShellLoading ? "loading" : "unknown"),
          tone: health?.status === "ok" ? "success" : health ? "warning" : "default",
        },
        {
          label: "Plugins",
          value: String(health?.runtime.totalPlugins ?? runtimePlugins.length),
          tone: "default",
        },
        {
          label: "Visible routes",
          value: String(registry.routes.length),
          tone: "default",
        },
        {
          label: "Session",
          value: authUser.status,
          tone: authUser.status === "active" ? "success" : "warning",
        },
      ]}
    >
      {shellError ? (
        <Card eyebrow="Bootstrap" title="Backoffice could not complete discovery">
          <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">{shellError}</p>
        </Card>
      ) : null}
      {isShellLoading && !shellError ? (
        <Card eyebrow="Bootstrap" title="Loading runtime discovery">
          <p className="text-sm leading-7 text-[color:var(--color-ink-muted)]">
            The backoffice is querying kernel health, installed plugins, and published capabilities.
          </p>
        </Card>
      ) : null}
      {!isShellLoading && !shellError ? content : null}
      {customContributions.length > 0 ? (
        <div className="mt-4">
          <Badge>custom backoffice modules enabled</Badge>
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
