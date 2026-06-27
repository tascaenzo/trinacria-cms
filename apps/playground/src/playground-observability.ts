import { createToken, defineModule, factoryProvider } from "@trinacria/core";
import {
  CORE_TOKENS,
  HttpController,
  httpProvider,
  requestId,
  response,
  type HttpContext,
  type HttpMiddleware,
  type KernelHealthService,
  type KernelHealthSnapshot,
  type PluginContributionCatalogSnapshot,
  type PluginRuntime
} from "@trinacria-cms/kernel";

const REQUEST_ID_STATE_KEY = "requestId";
const MAX_RECENT_ERRORS = 25;

export type StructuredLogLevel = "info" | "warn" | "error";
export type ChecklistStatus = "pass" | "warn" | "fail" | "manual";

export interface PlaygroundObservabilityConfig {
  enabled: boolean;
  metricsEnabled: boolean;
  checklistEnabled: boolean;
  logFormat: "json" | "text";
  includeUserAgent: boolean;
  token?: string;
}

export interface StructuredLogger {
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

export interface HttpMetricsSnapshot {
  startedAt: string;
  uptimeSeconds: number;
  requestsTotal: number;
  errorsTotal: number;
  byStatusClass: Record<string, number>;
  byMethod: Record<string, number>;
  recentErrors: readonly RecentHttpError[];
}

export interface RecentHttpError {
  at: string;
  requestId?: string;
  method: string;
  path: string;
  message: string;
}

export interface OpsChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
  details: Record<string, unknown>;
}

export interface OpsChecklistSnapshot {
  generatedAt: string;
  status: "ok" | "degraded" | "down";
  items: readonly OpsChecklistItem[];
}

export class JsonStructuredLogger implements StructuredLogger {
  constructor(private readonly config: Pick<PlaygroundObservabilityConfig, "logFormat">) {}

  info(message: string, metadata?: Record<string, unknown>): void {
    this.write("info", message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.write("warn", message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.write("error", message, metadata);
  }

  private write(
    level: StructuredLogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    if (this.config.logFormat === "text") {
      const serializedMetadata = metadata ? ` ${JSON.stringify(metadata)}` : "";
      const line = `[${level}] ${message}${serializedMetadata}`;
      if (level === "error") {
        console.error(line);
        return;
      }
      console.log(line);
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata ?? {})
    };
    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
      return;
    }
    console.log(line);
  }
}

export class PlaygroundMetricsRecorder {
  private readonly startedAt = new Date();
  private requestsTotal = 0;
  private errorsTotal = 0;
  private readonly byStatusClass = new Map<string, number>();
  private readonly byMethod = new Map<string, number>();
  private readonly recentErrors: RecentHttpError[] = [];

  recordRequest(input: { method: string; statusCode: number }): void {
    this.requestsTotal += 1;
    this.increment(this.byMethod, input.method);
    this.increment(this.byStatusClass, `${Math.floor(input.statusCode / 100)}xx`);
    if (input.statusCode >= 500) {
      this.errorsTotal += 1;
    }
  }

  recordError(input: Omit<RecentHttpError, "at">): void {
    this.errorsTotal += 1;
    this.recentErrors.unshift({
      at: new Date().toISOString(),
      ...input
    });
    if (this.recentErrors.length > MAX_RECENT_ERRORS) {
      this.recentErrors.pop();
    }
  }

  snapshot(): HttpMetricsSnapshot {
    return {
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      requestsTotal: this.requestsTotal,
      errorsTotal: this.errorsTotal,
      byStatusClass: Object.fromEntries(this.byStatusClass),
      byMethod: Object.fromEntries(this.byMethod),
      recentErrors: [...this.recentErrors]
    };
  }

  private increment(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) ?? 0) + 1);
  }
}

export function createPlaygroundObservabilityConfig(
  env: NodeJS.ProcessEnv = process.env
): PlaygroundObservabilityConfig {
  return {
    enabled: readBooleanEnv(env, "OBSERVABILITY_ENABLED", true),
    metricsEnabled: readBooleanEnv(env, "METRICS_ENABLED", true),
    checklistEnabled: readBooleanEnv(env, "OPS_CHECKLIST_ENABLED", true),
    logFormat: readLogFormat(env.LOG_FORMAT),
    includeUserAgent: readBooleanEnv(env, "REQUEST_LOG_USER_AGENT", false),
    ...(env.OBSERVABILITY_TOKEN?.trim() ? { token: env.OBSERVABILITY_TOKEN.trim() } : {})
  };
}

export function createObservabilityMiddlewares(input: {
  config: PlaygroundObservabilityConfig;
  logger: StructuredLogger;
  metrics: PlaygroundMetricsRecorder;
}): HttpMiddleware[] {
  if (!input.config.enabled) {
    return [];
  }

  return [requestId({ stateKey: REQUEST_ID_STATE_KEY }), createStructuredRequestLogger(input)];
}

export function registerProcessErrorReporting(logger: StructuredLogger): void {
  process.on("uncaughtException", (error) => {
    logger.error("process.uncaught_exception", serializeErrorMetadata(error));
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("process.unhandled_rejection", serializeErrorMetadata(reason));
  });
}

export function createPlaygroundObservabilityModule(input: {
  config: PlaygroundObservabilityConfig;
  metrics: PlaygroundMetricsRecorder;
  logger: StructuredLogger;
}) {
  return defineModule({
    name: "PlaygroundObservabilityModule",
    providers: [
      factoryProvider(PLAYGROUND_OBSERVABILITY_CONFIG, () => input.config, []),
      factoryProvider(PLAYGROUND_METRICS_RECORDER, () => input.metrics, []),
      factoryProvider(PLAYGROUND_STRUCTURED_LOGGER, () => input.logger, []),
      httpProvider(PLAYGROUND_OBSERVABILITY_CONTROLLER, PlaygroundObservabilityController, [
        PLAYGROUND_OBSERVABILITY_CONFIG,
        PLAYGROUND_METRICS_RECORDER,
        PLAYGROUND_STRUCTURED_LOGGER,
        CORE_TOKENS.KERNEL_HEALTH_SERVICE,
        CORE_TOKENS.PLUGIN_RUNTIME
      ])
    ],
    exports: [
      PLAYGROUND_OBSERVABILITY_CONFIG,
      PLAYGROUND_METRICS_RECORDER,
      PLAYGROUND_STRUCTURED_LOGGER,
      PLAYGROUND_OBSERVABILITY_CONTROLLER
    ]
  });
}

const PLAYGROUND_OBSERVABILITY_CONFIG = createToken<PlaygroundObservabilityConfig>(
  "PLAYGROUND_OBSERVABILITY_CONFIG"
);
const PLAYGROUND_METRICS_RECORDER = createToken<PlaygroundMetricsRecorder>(
  "PLAYGROUND_METRICS_RECORDER"
);
const PLAYGROUND_STRUCTURED_LOGGER = createToken<StructuredLogger>("PLAYGROUND_STRUCTURED_LOGGER");
const PLAYGROUND_OBSERVABILITY_CONTROLLER = createToken<PlaygroundObservabilityController>(
  "PLAYGROUND_OBSERVABILITY_CONTROLLER"
);

class PlaygroundObservabilityController extends HttpController {
  constructor(
    private readonly config: PlaygroundObservabilityConfig,
    private readonly metrics: PlaygroundMetricsRecorder,
    private readonly logger: StructuredLogger,
    private readonly health: KernelHealthService,
    private readonly runtime: PluginRuntime
  ) {
    super();
  }

  routes() {
    return this.router()
      .get("/metrics", this.getMetrics, {
        docs: { excludeFromOpenApi: true }
      })
      .get("/ready", this.getReadiness, {
        docs: { excludeFromOpenApi: true }
      })
      .get("/ops/checklist", this.getChecklist, {
        docs: { excludeFromOpenApi: true }
      })
      .build();
  }

  private getMetrics = async (ctx: HttpContext) => {
    if (!this.config.metricsEnabled) {
      return response(
        { error: { code: "metrics_disabled", message: "Metrics are disabled" } },
        { status: 404 }
      );
    }
    const denied = this.requireToken(ctx);
    if (denied) return denied;

    return {
      data: {
        http: this.metrics.snapshot()
      }
    };
  };

  private getReadiness = async () => {
    const checklist = await this.buildChecklist();
    if (checklist.status === "down") {
      this.emitAlert("readiness_failed", checklist);
    }

    return response(
      {
        data: checklist
      },
      {
        status: checklist.status === "down" ? 503 : 200
      }
    );
  };

  private getChecklist = async (ctx: HttpContext) => {
    if (!this.config.checklistEnabled) {
      return response(
        { error: { code: "checklist_disabled", message: "Operations checklist is disabled" } },
        { status: 404 }
      );
    }
    const denied = this.requireToken(ctx);
    if (denied) return denied;

    const checklist = await this.buildChecklist();
    if (checklist.status !== "ok") {
      this.emitAlert("ops_checklist_not_ok", checklist);
    }

    return { data: checklist };
  };

  private async buildChecklist(): Promise<OpsChecklistSnapshot> {
    const health = await this.health.snapshot();
    const contributions = this.runtime.describeContributions();
    const items = createOpsChecklistItems(health, contributions);
    const hasFail = items.some((item) => item.status === "fail");
    const hasWarning = items.some((item) => item.status === "warn" || item.status === "manual");

    return {
      generatedAt: new Date().toISOString(),
      status: hasFail ? "down" : hasWarning ? "degraded" : "ok",
      items
    };
  }

  private requireToken(ctx: HttpContext) {
    if (!this.config.token) {
      return null;
    }

    const authorization = readHeader(ctx, "authorization");
    if (authorization === `Bearer ${this.config.token}`) {
      return null;
    }

    return response(
      { error: { code: "observability_unauthorized", message: "Missing observability token" } },
      { status: 401 }
    );
  }

  private emitAlert(reason: string, checklist: OpsChecklistSnapshot): void {
    this.logger.warn("ops.alert", {
      reason,
      status: checklist.status,
      failingChecks: checklist.items
        .filter((item) => item.status === "fail")
        .map((item) => item.id),
      warningChecks: checklist.items
        .filter((item) => item.status === "warn" || item.status === "manual")
        .map((item) => item.id)
    });
  }
}

function createStructuredRequestLogger(input: {
  config: PlaygroundObservabilityConfig;
  logger: StructuredLogger;
  metrics: PlaygroundMetricsRecorder;
}): HttpMiddleware {
  return async (ctx, next) => {
    const startedAt = Date.now();
    const method = (ctx.req.method ?? "UNKNOWN").toUpperCase();
    const path = ctx.req.url ?? "<unknown>";
    const requestIdValue = readRequestId(ctx);

    try {
      const result = await next();
      const statusCode = readStatusCode(result, ctx);
      input.metrics.recordRequest({ method, statusCode });
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      input.metrics.recordError({
        requestId: requestIdValue,
        method,
        path,
        message: error instanceof Error ? error.message : String(error)
      });
      input.logger.error("http.request_error", {
        requestId: requestIdValue,
        method,
        path,
        statusCode: 500,
        durationMs,
        ...serializeErrorMetadata(error)
      });
      throw error;
    }
  };
}

export function createOpsChecklistItems(
  health: KernelHealthSnapshot,
  contributions: PluginContributionCatalogSnapshot
): OpsChecklistItem[] {
  const requiredDependencyIssues = health.dependencies.edges.filter(
    (edge) => !edge.optional && edge.status !== "ok"
  );
  const corePackLoaded = health.dependencies.nodes.some(
    (node) => node.pluginId === "core-pack" && node.state === "loaded"
  );
  const authSettings = contributions.settings.filter((setting) =>
    setting.key.startsWith("core-pack:auth:")
  );
  const settingsDefinitions = contributions.settings.filter((setting) =>
    setting.key.startsWith("core-pack:")
  );
  const settingsSections = contributions.admin.settingsSections.filter(
    (section) => section.pluginId === "core-pack"
  );

  return [
    {
      id: "health",
      label: "GET /health",
      status: health.status === "down" ? "fail" : health.status === "degraded" ? "warn" : "pass",
      details: {
        status: health.status,
        issues: health.issues
      }
    },
    {
      id: "db",
      label: "Database connectivity",
      status: health.db.ok ? "pass" : "fail",
      details: health.db
    },
    {
      id: "plugin_runtime",
      label: "Plugin runtime",
      status:
        health.runtime.byState.failed > 0 || requiredDependencyIssues.length > 0 ? "fail" : "pass",
      details: {
        totalPlugins: health.runtime.totalPlugins,
        byState: health.runtime.byState,
        requiredDependencyIssues
      }
    },
    {
      id: "auth",
      label: "Auth module",
      status: corePackLoaded && authSettings.length > 0 ? "pass" : "fail",
      details: {
        corePackLoaded,
        authSettings: authSettings.length
      }
    },
    {
      id: "backoffice",
      label: "Backoffice contribution registry",
      status:
        contributions.admin.routes.length > 0 && contributions.admin.navigation.length > 0
          ? "pass"
          : "fail",
      details: {
        routes: contributions.admin.routes.length,
        navigation: contributions.admin.navigation.length,
        resources: contributions.admin.resources.length
      }
    },
    {
      id: "login",
      label: "Login flow",
      status: process.env.CMS_INSTALLED?.trim().toLowerCase() === "true" ? "manual" : "warn",
      details: {
        installedFlag: process.env.CMS_INSTALLED === "true",
        manualCheck: "Submit admin credentials through the backoffice login screen"
      }
    },
    {
      id: "settings",
      label: "Settings registry",
      status: settingsDefinitions.length > 0 && settingsSections.length > 0 ? "pass" : "fail",
      details: {
        definitions: settingsDefinitions.length,
        sections: settingsSections.length
      }
    }
  ];
}

function readStatusCode(result: unknown, ctx: HttpContext): number {
  if (result && typeof result === "object" && "status" in result) {
    const status = (result as { status?: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
  }
  return ctx.res.statusCode || 200;
}

function readRequestId(ctx: HttpContext): string | undefined {
  const value = ctx.state[REQUEST_ID_STATE_KEY];
  return typeof value === "string" ? value : undefined;
}

function readHeader(ctx: HttpContext, name: string): string | undefined {
  const value = ctx.req.headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function serializeErrorMetadata(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    };
  }
  return { errorMessage: String(error) };
}

function readBooleanEnv(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = env[name]?.trim().toLowerCase();
  if (!raw) {
    return fallback;
  }
  return raw === "true" || raw === "1" || raw === "yes";
}

function readLogFormat(value: string | undefined): "json" | "text" {
  return value?.trim().toLowerCase() === "text" ? "text" : "json";
}
