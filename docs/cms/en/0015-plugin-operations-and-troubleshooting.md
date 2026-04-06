# 0015 - Plugin operations and troubleshooting

## Goal

Describe how to observe and administer installed plugins using the same semantics across the runtime, `kernel` APIs, and the backoffice.

## 1. Real operational model

The runtime does not expose a generic plugin marketplace.

It exposes an administrative surface consistent with what it can actually do:

- installed-plugin discovery;
- readable lifecycle state;
- visible capabilities and dependencies;
- supported runtime operations;
- minimum diagnostics for failures, disabled state, and recent events.

The currently supported operations are:

- `load`
- `unload`
- `reload`
- `disable`
- `enable`

Not exposed in `v1`:

- remote registry installation;
- backoffice-driven `unregister`;
- bypassing dependency rules or unsafe lifecycle states.

## 2. Canonical endpoints

Everything goes through the `kernel` endpoints:

- `GET /v1/system/plugins`
- `GET /v1/system/plugins/:pluginId`
- `POST /v1/system/plugins/:pluginId/operations`
- `GET /v1/system/plugins/:pluginId/events`
- `GET /v1/system/capabilities`

The backoffice `Plugins` page uses these same endpoints, not a UI-only contract.

This surface is admin-only.

In the official setup the `kernel` does not import the `core-pack` auth layer directly.
Instead, it receives an explicit bridge (`KernelAdminRouteGuard`) from the `core-pack` auth module, which applies the admin JWT middleware and declares the same requirement in OpenAPI.

## 3. What to read in a plugin snapshot

Main operational fields:

- `state`: current lifecycle state;
- `statusReason`: readable explanation of that state;
- `operations[]`: actions currently allowed;
- `failureCount`, `lastFailurePhase`, `failedAt`: failure context;
- `disabledReason`, `disabledAt`: disable context;
- `dependencies[]`: declared dependencies with operational status (`ok`, `missing`, `disabled`, `version-mismatch`);
- `lastError`: latest known error serialized in a useful shape;
- `capabilities[]`: capabilities published by the plugin.

Practical rule:

- decide actions from `operations[]`, not from `state` alone.

## 4. Recommended operational flow

### 4.1 Plugin in `failed`

1. Read `statusReason`, `lastFailurePhase`, and `lastError`.
2. Inspect `dependencies[]` for `missing`, `disabled`, or `version-mismatch`.
3. Open `GET /v1/system/plugins/:pluginId/events`.
4. If the context is coherent, try `reload` or `load` according to `operations[]`.

### 4.2 Plugin in `disabled`

1. Read `disabledReason`.
2. Verify whether the disable was manual or caused by another failure.
3. Run `enable`.
4. Only after that, run `load` or `reload` when allowed.

### 4.3 Plugin blocked by a dependency

1. Find the dependency with `status !== "ok"`.
2. Fix the dependency plugin first.
3. Retry the blocked plugin operation.

The runtime does not fake implicit fallbacks: it protects the real dependency graph.

## 5. HTTP examples

### Read one plugin detail

```http
GET /v1/system/plugins/core-pack
```

### Disable a plugin with an operator reason

```http
POST /v1/system/plugins/core-pack/operations
Content-Type: application/json

{
  "operation": "disable",
  "reason": "maintenance window"
}
```

### Read recent events

```http
GET /v1/system/plugins/core-pack/events
```

## 6. SDK example

```ts
const plugin = await cms.system.getInstalledPlugin({
  path: { pluginId: "core-pack" },
});

if (plugin.data.operations.some((item) => item.operation === "reload" && item.available)) {
  await cms.system.executePluginOperation({
    path: { pluginId: "core-pack" },
    body: { operation: "reload" },
  });
}

const events = await cms.system.listPluginEvents({
  path: { pluginId: "core-pack" },
});
```

## 7. Quick troubleshooting

| Symptom | Where to look | Recommended action |
| --- | --- | --- |
| Plugin in `failed` | `lastFailurePhase`, `lastError`, `events` | inspect phase and cause, then use `load`/`reload` only if `operations[]` allows it |
| Plugin in `disabled` | `disabledReason`, `events` | run `enable`, then retry `load` if available |
| Dependency `missing` | `dependencies[]` | register/load the dependency plugin first |
| Dependency `disabled` | `dependencies[]`, dependency snapshot | re-enable the dependency before the caller plugin |
| `version-mismatch` | `dependencies[]` | align required and installed versions |
| Operation rejected | `error.details.plugin.operations`, `error.details.recentEvents` | the runtime is protecting an invalid state or a dependency constraint |

## 8. Declared `M3` limits

`M3` makes plugins observable and administrable, but it does not introduce yet:

- remote catalog provisioning;
- orchestrated multi-plugin upgrades;
- dedicated kernel-level authorization independent from the host app;
- distributed observability outside the process.

These limits are intentional: the UI and APIs declare only the support that the current runtime actually provides.
