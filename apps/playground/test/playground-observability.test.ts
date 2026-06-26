import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "node:http";
import test from "node:test";
import type {
  HttpContext,
  KernelHealthSnapshot,
  PluginContributionCatalogSnapshot
} from "@trinacria-cms/kernel";
import {
  createObservabilityMiddlewares,
  createOpsChecklistItems,
  createPlaygroundObservabilityConfig,
  PlaygroundMetricsRecorder,
  type StructuredLogger
} from "../src/playground-observability.js";

test("observability config defaults to JSON logs and enabled metrics", () => {
  const config = createPlaygroundObservabilityConfig({});

  assert.equal(config.enabled, true);
  assert.equal(config.metricsEnabled, true);
  assert.equal(config.checklistEnabled, true);
  assert.equal(config.logFormat, "json");
});

test("observability middleware records successful requests", async () => {
  const metrics = new PlaygroundMetricsRecorder();
  const logger = createMemoryLogger();
  const [requestIdMiddleware, requestLoggerMiddleware] = createObservabilityMiddlewares({
    config: createPlaygroundObservabilityConfig({}),
    logger,
    metrics
  });

  assert.ok(requestIdMiddleware);
  assert.ok(requestLoggerMiddleware);

  const ctx = createHttpContext({ method: "GET", url: "/health" });
  await requestIdMiddleware(ctx, () =>
    requestLoggerMiddleware(ctx, async () => ({ status: 200, body: { ok: true } }))
  );

  const snapshot = metrics.snapshot();
  assert.equal(snapshot.requestsTotal, 1);
  assert.equal(snapshot.byMethod.GET, 1);
  assert.equal(snapshot.byStatusClass["2xx"], 1);
  assert.equal(logger.messages[0]?.message, "http.request");
});

test("observability middleware records and logs thrown errors", async () => {
  const metrics = new PlaygroundMetricsRecorder();
  const logger = createMemoryLogger();
  const [, requestLoggerMiddleware] = createObservabilityMiddlewares({
    config: createPlaygroundObservabilityConfig({}),
    logger,
    metrics
  });

  assert.ok(requestLoggerMiddleware);

  await assert.rejects(
    () =>
      requestLoggerMiddleware(
        createHttpContext({ method: "POST", url: "/v1/auth/login" }),
        async () => {
          throw new Error("database unavailable");
        }
      ),
    /database unavailable/
  );

  const snapshot = metrics.snapshot();
  assert.equal(snapshot.errorsTotal, 1);
  assert.equal(snapshot.recentErrors[0]?.message, "database unavailable");
  assert.equal(logger.messages[0]?.message, "http.request_error");
});

test("ops checklist covers health, db, runtime, auth, backoffice, login and settings", () => {
  const items = createOpsChecklistItems(createHealthSnapshot(), createContributionSnapshot());

  assert.deepEqual(
    items.map((item) => item.id),
    ["health", "db", "plugin_runtime", "auth", "backoffice", "login", "settings"]
  );
  assert.equal(items.find((item) => item.id === "db")?.status, "pass");
  assert.equal(items.find((item) => item.id === "auth")?.status, "pass");
  assert.equal(items.find((item) => item.id === "settings")?.status, "pass");
});

function createMemoryLogger(): StructuredLogger & {
  messages: Array<{ level: string; message: string; metadata?: Record<string, unknown> }>;
} {
  const messages: Array<{ level: string; message: string; metadata?: Record<string, unknown> }> =
    [];
  return {
    messages,
    info(message, metadata) {
      messages.push({ level: "info", message, metadata });
    },
    warn(message, metadata) {
      messages.push({ level: "warn", message, metadata });
    },
    error(message, metadata) {
      messages.push({ level: "error", message, metadata });
    }
  };
}

function createHttpContext(input: { method: string; url: string }): HttpContext {
  return {
    req: {
      method: input.method,
      url: input.url,
      headers: {}
    } as IncomingMessage,
    res: new ServerResponse({} as IncomingMessage),
    params: {},
    query: {},
    body: undefined,
    signal: new AbortController().signal,
    abort() {},
    state: {}
  };
}

function createHealthSnapshot(): KernelHealthSnapshot {
  return {
    timestamp: new Date("2026-06-23T00:00:00.000Z"),
    status: "ok",
    runtime: {
      totalPlugins: 1,
      byState: {
        registered: 0,
        loading: 0,
        initializing: 0,
        loaded: 1,
        unloading: 0,
        failed: 0,
        disabled: 0,
        unloaded: 0
      }
    },
    dependencies: {
      nodes: [{ pluginId: "core-pack", state: "loaded", version: "0.1.0" }],
      edges: [],
      warnings: []
    },
    db: { ok: true },
    issues: []
  };
}

function createContributionSnapshot(): PluginContributionCatalogSnapshot {
  return {
    entities: [],
    settings: [
      {
        pluginId: "core-pack",
        key: "core-pack:auth:jwt_access_ttl_seconds",
        declaration: {
          key: "core-pack:auth:jwt_access_ttl_seconds",
          category: "auth"
        }
      },
      {
        pluginId: "core-pack",
        key: "core-pack:site:name",
        declaration: {
          key: "core-pack:site:name",
          category: "site"
        }
      }
    ],
    events: {
      emits: [],
      subscribes: []
    },
    admin: {
      navigation: [
        {
          pluginId: "core-pack",
          key: "settings",
          declaration: { id: "settings", label: "Settings", path: "/settings" }
        }
      ],
      routes: [
        {
          pluginId: "core-pack",
          key: "settings",
          declaration: { id: "settings", label: "Settings", path: "/settings" }
        }
      ],
      resources: [],
      widgets: [],
      settingsSections: [
        {
          pluginId: "core-pack",
          key: "core-pack-settings",
          declaration: {
            id: "core-pack-settings",
            label: "Settings",
            namespace: "settings"
          }
        }
      ]
    }
  };
}
