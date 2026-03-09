import { isValidPermissionKey, isValidPermissionPattern, s, type Infer } from "@trinacria-cms/kernel";
import {
  ApiKeyKindSchema,
  ApiKeyPolicyRuleSchema,
} from "../api-keys.schemas.js";

/**
 * DTO schema for issuing a new API key from the admin API.
 */
export const CreateApiKeyInputSchema = s.object(
  {
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    kind: ApiKeyKindSchema.optional(),
    roleCodes: s
      .array(
        s.string({
          trim: true,
          toLowerCase: true,
          minLength: 2,
          maxLength: 64,
          pattern: /^[a-z0-9][a-z0-9._-]*$/,
        }),
        { unique: true },
      )
      .optional(),
    permissionKeys: s
      .array(
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
      )
      .optional(),
    policyRules: s.array(ApiKeyPolicyRuleSchema).optional(),
    expiresAt: s.dateTimeString().optional(),
  },
  { strict: true },
);

export type CreateApiKeyInput = Infer<typeof CreateApiKeyInputSchema>;

/**
 * DTO schema for rotating one existing API key.
 * Rotation can also replace metadata/scopes in the same transaction.
 */
export const RotateApiKeyInputSchema = s.object(
  {
    name: s.string({ trim: true, minLength: 1, maxLength: 120 }).optional(),
    description: s.string({ trim: true, maxLength: 500 }).optional(),
    roleCodes: s
      .array(
        s.string({
          trim: true,
          toLowerCase: true,
          minLength: 2,
          maxLength: 64,
          pattern: /^[a-z0-9][a-z0-9._-]*$/,
        }),
        { unique: true },
      )
      .optional(),
    permissionKeys: s
      .array(
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
      )
      .optional(),
    policyRules: s
      .array(
        s.object(
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
        ),
      )
      .optional(),
    expiresAt: s.dateTimeString().optional(),
  },
  { strict: true },
);

export type RotateApiKeyInput = Infer<typeof RotateApiKeyInputSchema>;

/**
 * DTO schema for revoking an API key.
 */
export const RevokeApiKeyInputSchema = s.object(
  {
    reason: s.string({ trim: true, maxLength: 500 }).optional(),
  },
  { strict: true },
);

export type RevokeApiKeyInput = Infer<typeof RevokeApiKeyInputSchema>;

/**
 * DTO schema for list query parameters.
 */
export const ListApiKeysQuerySchema = s.object(
  {
    kind: ApiKeyKindSchema.optional(),
    status: s.enum(["active", "revoked"] as const).optional(),
    limit: s.number({ int: true, min: 1, max: 200 }).optional(),
    offset: s.number({ int: true, min: 0 }).optional(),
  },
  { strict: true },
);

export type ListApiKeysQuery = Infer<typeof ListApiKeysQuerySchema>;
