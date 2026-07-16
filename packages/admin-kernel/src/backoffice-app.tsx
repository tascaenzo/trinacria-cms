import { useActionState, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminShell, Card, SearchField } from "@trinacria-cms/trinacria-ui";
import type {
  GetAuthenticatedUserResponse,
  GetInstallationStatusResponse,
  LoginWithPasswordResponse,
  CompleteLoginMfaEnrollmentResponse,
  CompleteMfaLoginResponse
} from "@trinacria-cms/sdk";
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
import { getSdkErrorDetails, type SdkErrorDetails } from "./lib/sdk-errors.js";
import { formatUserName } from "./lib/user-formatting.js";
import { AuthScreenLayout } from "./components/auth-screen-layout.js";
import type { BackofficeModule } from "./module.js";
import { readRequiredString } from "./runtime/action-state.js";
import { clearBackofficeSession, persistBackofficeSession } from "./runtime/auth-session.js";
import { cms } from "./runtime/cms-sdk.js";
import { loadRemoteBackofficeI18n } from "./lib/remote-i18n.js";
import { InstallationDatabaseGuidePage } from "./pages/installation-database-guide-page.js";
import { InstallationBootstrapPage } from "./pages/installation-bootstrap-page.js";
import { LoginPage } from "./pages/login-page.js";
import { MfaLoginPage, MfaRecoveryCodesPage } from "./pages/mfa-login-page.js";
import { BackofficeShellStatus } from "./backoffice-app/backoffice-shell-status.js";
import { BackofficeUserMenu } from "./backoffice-app/backoffice-user-menu.js";
import { useBackofficeRouteState } from "./backoffice-app/use-backoffice-route-state.js";
import { useBackofficeShellRuntime } from "./backoffice-app/use-backoffice-shell-runtime.js";
import { useAuthenticatedRoleLabel } from "./backoffice-app/use-authenticated-role-label.js";
import {
  applyBackofficeTheme,
  BACKOFFICE_ACCENT_SETTING_KEY,
  BACKOFFICE_THEME_SETTING_KEY
} from "./lib/backoffice-theme.js";

type AuthenticatedUser = GetAuthenticatedUserResponse["data"];
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
type PasswordLoginResult = LoginWithPasswordResponse["data"];
type LoginSession = Exclude<PasswordLoginResult, { status: string }>;
type MfaChallenge = Extract<PasswordLoginResult, { status: string }>;
type LoginActionState = FormActionState<LoginSession>;
type InstallationActionState = FormActionState<LoginSession>;
type MfaSession = CompleteLoginMfaEnrollmentResponse["data"] | CompleteMfaLoginResponse["data"];

const USER_MENU_NAVIGATION_IDS = ["nav-settings"] as const;

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
  const [activeRouteId, navigateTo] = useBackofficeRouteState();
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [installationStatus, setInstallationStatus] = useState<InstallationStatus | null>(null);
  const [bootstrapError, setBootstrapError] = useState<SdkErrorDetails | null>(null);
  const [isBootstrappingApp, setIsBootstrappingApp] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [remoteI18nBundle, setRemoteI18nBundle] = useState<I18nBundle | null>(null);
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);
  const [mfaSetup, setMfaSetup] = useState<{ manualKey: string; otpauthUrl: string; expiresAt: string } | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isMfaSubmitting, setIsMfaSubmitting] = useState(false);
  const [mfaPendingSession, setMfaPendingSession] = useState<MfaSession | null>(null);
  const translationBundles = useMemo<readonly I18nBundle[]>(
    () => [
      officialI18nBundle,
      ...modules.flatMap((module) => module.i18n ?? []),
      ...(remoteI18nBundle ? [remoteI18nBundle] : [])
    ],
    [modules, remoteI18nBundle]
  );
  const t = useMemo(
    () => createTranslate(locale, translationBundles, "en"),
    [locale, translationBundles]
  );
  const handleLocaleChange = useCallback((nextLocale: string) => {
    setLocale(normalizeLocale(nextLocale));
  }, []);
  const authRoleLabel = useAuthenticatedRoleLabel(authUser, t);
  const {
    canCustomizeDashboard,
    capabilityIndex,
    isShellLoading,
    registry,
    runtimePlugins,
    shellError
  } = useBackofficeShellRuntime({
    authUser,
    installationInstalled: Boolean(installationStatus?.installed),
    modules,
    t
  });

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
    if (authUser?.locale) {
      setLocale(normalizeLocale(authUser.locale));
    }
  }, [authUser?.locale]);

  useEffect(() => {
    if (!authUser) {
      setRemoteI18nBundle(null);
      return;
    }

    const controller = new AbortController();
    void loadRemoteBackofficeI18n(locale, { signal: controller.signal })
      .then((bundle) => {
        if (!controller.signal.aborted) setRemoteI18nBundle(bundle);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // Package-local assets remain the safe bootstrap and offline fallback.
          setRemoteI18nBundle(null);
        }
      });

    return () => controller.abort();
  }, [authUser, locale]);

  useEffect(() => {
    let isCancelled = false;

    async function loadBackofficeTheme() {
      if (!authUser) {
        applyBackofficeTheme("light", "neutral");
        return;
      }

      try {
        const [themeResponse, accentResponse] = await Promise.all([
          cms.settings.getSettingValueByKey({ path: { key: BACKOFFICE_THEME_SETTING_KEY } }),
          cms.settings.getSettingValueByKey({ path: { key: BACKOFFICE_ACCENT_SETTING_KEY } })
        ]);
        if (!isCancelled) {
          applyBackofficeTheme(themeResponse.data?.value, accentResponse.data?.value);
        }
      } catch {
        if (!isCancelled) {
          applyBackofficeTheme("light", "neutral");
        }
      }
    }

    void loadBackofficeTheme();
    return () => {
      isCancelled = true;
    };
  }, [authUser]);

  const completeLogin = useCallback(
    (response: LoginSession | MfaSession) => {
      persistBackofficeSession({
        expiresAt: response.expiresAt
      });
      setAuthUser(response.user);
      navigateTo("dashboard");
    },
    [navigateTo]
  );

  const [loginState, submitLogin, isLoggingIn] = useActionState<LoginActionState, FormData>(
    async (_previousState, formData) => {
      try {
        const response = await cms.auth.loginWithPassword({
          body: {
            email: readRequiredString(formData, "email"),
            password: readRequiredString(formData, "password")
          }
        });

        if (isMfaChallenge(response.data)) {
          setMfaChallenge(response.data);
          setMfaSetup(null);
          setMfaError(null);
          return { ok: false, error: null, data: null };
        }
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
    createIdleFormActionState<LoginSession>()
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

      if (isMfaChallenge(loginResponse.data)) {
        return {
          ok: false,
          error: { code: "auth_mfa_enrollment_required", message: "Complete MFA enrollment before signing in." },
          data: null
        };
      }
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
  }, createIdleFormActionState<LoginSession>());

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
    if (mfaChallenge?.status !== "mfa_enrollment_required") return;
    let cancelled = false;
    void cms.auth
      .beginLoginMfaEnrollment({ body: { challengeId: mfaChallenge.challengeId } })
      .then((response) => {
        if (!cancelled) setMfaSetup(response.data);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMfaError(toDisplayMfaError(error));
      });
    return () => {
      cancelled = true;
    };
  }, [mfaChallenge]);

  const submitMfa = async (formData: FormData) => {
    if (!mfaChallenge) return;
    setIsMfaSubmitting(true);
    setMfaError(null);
    try {
      const code = readRequiredString(formData, "code");
      const result =
        mfaChallenge.status === "mfa_required"
          ? await cms.auth.completeMfaLogin({ body: { challengeId: mfaChallenge.challengeId, code } })
          : await cms.auth.completeLoginMfaEnrollment({ body: { challengeId: mfaChallenge.challengeId, code } });
      if (result.data.recoveryCodes?.length) {
        setMfaPendingSession(result.data);
      } else {
        completeLogin(result.data);
      }
    } catch (error) {
      setMfaError(toDisplayMfaError(error));
    } finally {
      setIsMfaSubmitting(false);
    }
  };

  const cancelMfa = () => {
    setMfaChallenge(null);
    setMfaSetup(null);
    setMfaError(null);
  };

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
    const fallbackRouteId = registry.routes[0]?.id;
    if (
      fallbackRouteId &&
      activeRouteId !== fallbackRouteId &&
      !registry.routes.some((route) => route.id === activeRouteId)
    ) {
      navigateTo(fallbackRouteId);
    }
  }, [activeRouteId, navigateTo, registry.routes]);

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

  async function handleLogout() {
    try {
      await cms.auth.logoutSession();
    } finally {
      clearBackofficeSession();
      setAuthUser(null);
      setIsUserMenuOpen(false);
      navigateTo("dashboard");
    }
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
    if (mfaPendingSession?.recoveryCodes?.length) {
      return renderWithI18n(
        <MfaRecoveryCodesPage
          recoveryCodes={mfaPendingSession.recoveryCodes}
          onContinue={() => completeLogin(mfaPendingSession)}
        />
      );
    }
    if (mfaChallenge) {
      return renderWithI18n(
        <MfaLoginPage
          mode={mfaChallenge.status === "mfa_required" ? "verify" : "enroll"}
          setup={mfaSetup}
          action={submitMfa}
          isSubmitting={isMfaSubmitting}
          error={mfaError}
          onCancel={cancelMfa}
        />
      );
    }
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
        canCustomizeDashboard,
        navigateToRoute: navigateTo,
        cms,
        t
      })
    : null;

  return renderWithI18n(
    <AdminShell
      activeRouteId={activeRoute?.id ?? ""}
      navigation={registry.navigation}
      hiddenNavigationIds={USER_MENU_NAVIGATION_IDS}
      onNavigate={navigateTo}
      title={activeRoute?.title ?? t("backoffice.shell.title")}
      subtitle={activeRoute?.summary ?? t("backoffice.shell.subtitle")}
      hideHeader
      sidebarFooter={
        <BackofficeUserMenu
          isOpen={isUserMenuOpen}
          roleLabel={authRoleLabel}
          settingsRouteAvailable={hasSettingsRoute}
          userName={userName}
          onLogout={handleLogout}
          onNavigate={navigateTo}
          onOpenChange={setIsUserMenuOpen}
          t={t}
        />
      }
      headerActions={
        <div className="hidden md:flex md:w-[320px] lg:w-[360px]">
          <SearchField placeholder={t("backoffice.shell.search_placeholder")} />
        </div>
      }
    >
      {shouldShowShellDiscoveryState ? (
        <BackofficeShellStatus error={shellError} isLoading={isShellLoading} t={t} />
      ) : null}
      {shouldRenderContent ? content : null}
    </AdminShell>
  );
}

function isMfaChallenge(value: PasswordLoginResult): value is MfaChallenge {
  return "status" in value;
}

function toDisplayMfaError(error: unknown): string {
  return getSdkErrorDetails(error).message ?? "Unable to complete two-factor authentication.";
}
