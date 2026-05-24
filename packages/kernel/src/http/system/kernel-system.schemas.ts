import { s } from "@trinacria/schema";

export const PluginSourceSchema = s.object(
  {
    type: s.enum(["workspace", "package", "local-path"] as const),
    name: s.string({ trim: true, minLength: 1 }),
    entrypoint: s.string({ trim: true, minLength: 1 }),
    status: s.enum(["discovered", "failed", "disabled"] as const),
    pluginId: s.string({ trim: true, minLength: 1 }).optional(),
    error: s.string({ trim: true, minLength: 1 }).optional()
  },
  { strict: true }
);

export const KernelInstalledPluginSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    version: s.string({ trim: true, minLength: 1 }),
    requiresCore: s.string({ trim: true, minLength: 1 }),
    state: s.enum([
      "registered",
      "loading",
      "initializing",
      "loaded",
      "unloading",
      "failed",
      "disabled",
      "unloaded"
    ] as const),
    source: PluginSourceSchema.optional(),
    capabilities: s.array(s.string({ trim: true, minLength: 1 })),
    dependencies: s.array(
      s.object(
        {
          pluginId: s.string({ trim: true, minLength: 1 }),
          versionRange: s.string({ trim: true, minLength: 1 }),
          optional: s.boolean(),
          status: s.enum(["ok", "missing", "disabled", "version-mismatch"] as const),
          currentVersion: s.string({ trim: true, minLength: 1 }).optional(),
          state: s
            .enum([
              "registered",
              "loading",
              "initializing",
              "loaded",
              "unloading",
              "failed",
              "disabled",
              "unloaded"
            ] as const)
            .optional(),
          reason: s.string({ trim: true, minLength: 1 }).optional()
        },
        { strict: true }
      )
    ),
    security: s.object(
      {
        permissions: s.number({ int: true, min: 0 }),
        roles: s.number({ int: true, min: 0 }),
        grants: s.number({ int: true, min: 0 }),
        policyRules: s.number({ int: true, min: 0 })
      },
      { strict: true }
    ),
    failureCount: s.number({ int: true, min: 0 }),
    failedAt: s.dateTimeString().optional(),
    lastFailurePhase: s
      .enum(["register", "dependency-check", "load", "init", "unload", "rollback"] as const)
      .optional(),
    disabledAt: s.dateTimeString().optional(),
    disabledReason: s.string({ trim: true, minLength: 1 }).optional(),
    loadedAt: s.dateTimeString().optional(),
    statusReason: s
      .object(
        {
          code: s.string({ trim: true, minLength: 1 }),
          message: s.string({ trim: true, minLength: 1 })
        },
        { strict: false }
      )
      .optional(),
    lastError: s
      .object(
        {
          name: s.string({ trim: true, minLength: 1 }),
          message: s.string({ trim: true, minLength: 1 }),
          code: s.string({ trim: true, minLength: 1 }).optional()
        },
        { strict: false }
      )
      .optional(),
    operations: s.array(
      s.object(
        {
          operation: s.enum(["load", "unload", "reload", "disable", "enable"] as const),
          available: s.boolean(),
          reason: s.string({ trim: true, minLength: 1 }).optional()
        },
        { strict: true }
      )
    )
  },
  { strict: true }
);

export const KernelCapabilitySchema = s.object(
  {
    pluginId: s.string({ trim: true, minLength: 1 }),
    capability: s.string({ trim: true, minLength: 1 }),
    version: s.string({ trim: true, minLength: 1 }),
    state: s.enum([
      "registered",
      "loading",
      "initializing",
      "loaded",
      "unloading",
      "failed",
      "disabled",
      "unloaded"
    ] as const)
  },
  { strict: true }
);

export const KernelSystemMetaSchema = s.object(
  {
    pluginId: s.literal("kernel").optional(),
    count: s.number({ int: true }).optional()
  },
  { strict: true }
);

export const ListInstalledPluginsResponseSchema = s.object(
  {
    data: s.array(KernelInstalledPluginSchema),
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

export const GetInstalledPluginResponseSchema = s.object(
  {
    data: KernelInstalledPluginSchema,
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

export const ListCapabilitiesResponseSchema = s.object(
  {
    data: s.array(KernelCapabilitySchema),
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

export const ListPluginSourcesResponseSchema = s.object(
  {
    data: s.array(PluginSourceSchema),
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

export const PluginContributionSnapshotSchema = s.object(
  {
    pluginId: s.string({ trim: true, minLength: 1 }),
    key: s.string({ trim: true, minLength: 1 }),
    declaration: s.object({}, { strict: false })
  },
  { strict: true }
);

export const PluginContributionCatalogSchema = s.object(
  {
    entities: s.array(PluginContributionSnapshotSchema),
    settings: s.array(PluginContributionSnapshotSchema),
    events: s.object(
      {
        emits: s.array(PluginContributionSnapshotSchema),
        subscribes: s.array(PluginContributionSnapshotSchema)
      },
      { strict: true }
    ),
    admin: s.object(
      {
        navigation: s.array(PluginContributionSnapshotSchema),
        routes: s.array(PluginContributionSnapshotSchema),
        resources: s.array(PluginContributionSnapshotSchema),
        widgets: s.array(PluginContributionSnapshotSchema),
        settingsSections: s.array(PluginContributionSnapshotSchema)
      },
      { strict: true }
    )
  },
  { strict: true }
);

export const ListPluginContributionsResponseSchema = s.object(
  {
    data: PluginContributionCatalogSchema,
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

export const PluginOperationRequestSchema = s.object(
  {
    operation: s.enum(["load", "unload", "reload", "disable", "enable"] as const),
    reason: s.string({ trim: true, minLength: 1, maxLength: 1000 }).optional()
  },
  { strict: true }
);

export const PluginOperationResultSchema = s.object(
  {
    plugin: KernelInstalledPluginSchema,
    operation: s.enum(["load", "unload", "reload", "disable", "enable"] as const),
    executedAt: s.dateTimeString()
  },
  { strict: true }
);

export const PluginOperationResponseSchema = s.object(
  {
    data: PluginOperationResultSchema,
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

export const PluginEventSchema = s.object(
  {
    sequence: s.number({ int: true, min: 1 }),
    timestamp: s.dateTimeString(),
    pluginId: s.string({ trim: true, minLength: 1 }),
    action: s.enum([
      "register",
      "unregister",
      "load",
      "unload",
      "reload",
      "disable",
      "enable",
      "load-many"
    ] as const),
    success: s.boolean(),
    phase: s
      .enum(["register", "dependency-check", "load", "init", "unload", "rollback"] as const)
      .optional(),
    message: s.string({ trim: true, minLength: 1 }).optional(),
    durationMs: s.number({ int: true, min: 0 }).optional(),
    stateBefore: s
      .enum([
        "registered",
        "loading",
        "initializing",
        "loaded",
        "unloading",
        "failed",
        "disabled",
        "unloaded"
      ] as const)
      .optional(),
    stateAfter: s
      .enum([
        "registered",
        "loading",
        "initializing",
        "loaded",
        "unloading",
        "failed",
        "disabled",
        "unloaded"
      ] as const)
      .optional()
  },
  { strict: false }
);

export const PluginEventsResponseSchema = s.object(
  {
    data: s.array(PluginEventSchema),
    meta: KernelSystemMetaSchema.optional()
  },
  { strict: true }
);

export const PluginEventsQueryParameters = [
  {
    name: "limit",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 200 }
  }
] as const;
