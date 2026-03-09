import {
  defineEntity,
  isValidPermissionKey,
  isValidPermissionPattern,
  s,
  type Infer,
} from "@trinacria-cms/kernel";

export const ApiKeyKindSchema = s.enum(
  ["publishable", "secret", "service"] as const,
);

export const ApiKeyStatusSchema = s.enum(["active", "revoked"] as const);

/**
 * Embedded wildcard allow/deny rule directly assigned to one API key.
 */
export const ApiKeyPolicyRuleSchema = s.object(
  {
    effect: s.enum(["allow", "deny"] as const),
    permissionPattern: s
      .string({ trim: true, toLowerCase: true, minLength: 3, maxLength: 220 })
      .refine(
        (value) => isValidPermissionPattern(value),
        "Permission pattern must be '<pluginId>:<resource|*>:<action|*>'",
        "invalid_permission_pattern",
      ),
    conditions: s.array(
      s.enum(["resource_id_required", "resource_id_equals_subject"] as const),
      { unique: true },
    ),
  },
  { strict: true },
);

/**
 * Persistence record for one issued API key.
 * Secret material is never returned by public API after creation/rotation.
 */
export const ApiKeyRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    lookupId: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 6,
      maxLength: 64,
      pattern: /^[a-z0-9]+$/,
    }),
    keyPrefix: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    secretHash: s.string({ trim: true, minLength: 32, maxLength: 512 }),
    secretPreview: s.string({ trim: true, minLength: 4, maxLength: 24 }),
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    kind: ApiKeyKindSchema,
    status: ApiKeyStatusSchema,
    roleCodes: s.array(
      s.string({
        trim: true,
        toLowerCase: true,
        minLength: 2,
        maxLength: 64,
        pattern: /^[a-z0-9][a-z0-9._-]*$/,
      }),
      { unique: true },
    ),
    permissionKeys: s.array(
      s
        .string({
          trim: true,
          toLowerCase: true,
          minLength: 3,
          maxLength: 220,
        })
        .refine(
          (value) => isValidPermissionKey(value),
          "Permission key must be '<pluginId>:<resource>:<action>'",
          "invalid_permission_key",
        ),
      { unique: true },
    ),
    policyRules: s.array(ApiKeyPolicyRuleSchema, {
      unique: (rule) =>
        `${rule.effect}|${rule.permissionPattern}|${rule.conditions.join(",")}`,
    }),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
    lastUsedAt: s.dateTimeString().optional(),
    expiresAt: s.dateTimeString().optional(),
    revokedAt: s.dateTimeString().optional(),
  },
  { strict: true },
);

export type ApiKeyRecord = Infer<typeof ApiKeyRecordSchema>;
export type ApiKeyPolicyRule = Infer<typeof ApiKeyPolicyRuleSchema>;
export type ApiKeyKind = Infer<typeof ApiKeyKindSchema>;

/**
 * Public view returned by HTTP APIs and SDK consumers.
 */
export const ApiKeyPublicRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    keyPrefix: s.string({ trim: true, minLength: 1 }),
    secretPreview: s.string({ trim: true, minLength: 4 }),
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    kind: ApiKeyKindSchema,
    status: ApiKeyStatusSchema,
    roleCodes: s.array(s.string({ trim: true, minLength: 2 })),
    permissionKeys: s.array(s.string({ trim: true, minLength: 3 })),
    policyRules: s.array(ApiKeyPolicyRuleSchema),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString(),
    lastUsedAt: s.dateTimeString().optional(),
    expiresAt: s.dateTimeString().optional(),
    revokedAt: s.dateTimeString().optional(),
  },
  { strict: true },
);

export type ApiKeyPublicRecord = Infer<typeof ApiKeyPublicRecordSchema>;

/**
 * Canonical API key entity declaration.
 * Authorization metadata stays embedded to avoid extra join collections.
 */
export const API_KEYS_ENTITY = defineEntity({
  entityName: "api_keys",
  schema: ApiKeyRecordSchema,
  indexes: [
    {
      fields: { id: 1 },
      unique: true,
      name: "api_keys_id_unique",
    },
    {
      fields: { lookupId: 1 },
      unique: true,
      name: "api_keys_lookup_id_unique",
    },
    {
      fields: { status: 1 },
      name: "api_keys_status_idx",
    },
    {
      fields: { kind: 1 },
      name: "api_keys_kind_idx",
    },
    {
      fields: { createdAt: -1 },
      name: "api_keys_created_at_desc_idx",
    },
  ] as const,
});
