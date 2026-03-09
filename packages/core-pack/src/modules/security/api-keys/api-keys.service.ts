import { CoreError } from "@trinacria-cms/kernel";
import { PermissionsRepository } from "../../permissions/permissions.repository.js";
import { RoleGrantsRepository } from "../../roles/grants/role-grants.repository.js";
import { RolesRepository } from "../../roles/roles.repository.js";
import { RolePolicyRulesRepository } from "../role-policy-rules/role-policy-rules.repository.js";
import {
  dedupeAuthorizationRules,
  type AuthorizationRule,
} from "../authz-rules.js";
import {
  CreateApiKeyInputSchema,
  RotateApiKeyInputSchema,
  type CreateApiKeyInput,
  type RotateApiKeyInput,
} from "./dto/api-keys.input.dto.js";
import { ApiKeyHashingService } from "./api-key-hashing.service.js";
import {
  ApiKeyPublicRecordSchema,
  type ApiKeyPublicRecord,
  type ApiKeyRecord,
} from "./api-keys.schemas.js";
import { ApiKeysRepository } from "./api-keys.repository.js";

export interface ApiKeyAuthenticationResult {
  subjectId: string;
  record: ApiKeyPublicRecord;
}

export interface IssuedApiKeyResult {
  record: ApiKeyPublicRecord;
  apiKey: string;
}

/**
 * Application service for machine-to-machine credentials.
 * It owns issuance, rotation, revocation, and authorization rule resolution.
 */
export class ApiKeysService {
  constructor(
    private readonly apiKeys: ApiKeysRepository,
    private readonly hashing: ApiKeyHashingService,
    private readonly roles: RolesRepository,
    private readonly roleGrants: RoleGrantsRepository,
    private readonly rolePolicyRules: RolePolicyRulesRepository,
    private readonly permissions: PermissionsRepository,
  ) {}

  async create(input: CreateApiKeyInput): Promise<IssuedApiKeyResult> {
    const parsed = CreateApiKeyInputSchema.parse(input);
    await this.assertAssignmentsExist(parsed);

    const material = this.hashing.issue();
    const now = new Date().toISOString();
    const record = await this.apiKeys.create({
      lookupId: material.lookupId,
      keyPrefix: material.keyPrefix,
      secretHash: material.secretHash,
      secretPreview: material.secretPreview,
      name: parsed.name,
      ...(parsed.description ? { description: parsed.description } : {}),
      kind: parsed.kind ?? "secret",
      status: "active",
      roleCodes: [...(parsed.roleCodes ?? [])],
      permissionKeys: [...(parsed.permissionKeys ?? [])],
      policyRules: [...(parsed.policyRules ?? [])],
      createdAt: now,
      updatedAt: now,
      ...(parsed.expiresAt ? { expiresAt: parsed.expiresAt } : {}),
    });

    return {
      record: this.toPublicRecord(record),
      apiKey: material.rawKey,
    };
  }

  async list(options?: {
    kind?: ApiKeyRecord["kind"];
    status?: ApiKeyRecord["status"];
    limit?: number;
    offset?: number;
  }): Promise<readonly ApiKeyPublicRecord[]> {
    const records = await this.apiKeys.list(options);
    return records.map((record) => this.toPublicRecord(record));
  }

  async getById(id: string): Promise<ApiKeyPublicRecord | null> {
    const record = await this.apiKeys.findById(id);
    return record ? this.toPublicRecord(record) : null;
  }

  async rotate(
    id: string,
    input?: RotateApiKeyInput,
  ): Promise<IssuedApiKeyResult | null> {
    const existing = await this.apiKeys.findById(id);
    if (!existing) return null;

    const parsed = RotateApiKeyInputSchema.parse(input ?? {});
    await this.assertAssignmentsExist({
      name: parsed.name ?? existing.name,
      ...(parsed.description !== undefined
        ? { description: parsed.description }
        : existing.description
          ? { description: existing.description }
          : {}),
      kind: existing.kind,
      roleCodes: parsed.roleCodes ?? existing.roleCodes,
      permissionKeys: parsed.permissionKeys ?? existing.permissionKeys,
      policyRules: parsed.policyRules ?? existing.policyRules,
      expiresAt: parsed.expiresAt ?? existing.expiresAt,
    });

    const material = this.hashing.issue();
    const updated = await this.apiKeys.updateById(id, {
      lookupId: material.lookupId,
      keyPrefix: material.keyPrefix,
      secretHash: material.secretHash,
      secretPreview: material.secretPreview,
      ...(parsed.name ? { name: parsed.name } : {}),
      ...(parsed.description !== undefined
        ? { description: parsed.description }
        : {}),
      ...(parsed.roleCodes ? { roleCodes: [...parsed.roleCodes] } : {}),
      ...(parsed.permissionKeys
        ? { permissionKeys: [...parsed.permissionKeys] }
        : {}),
      ...(parsed.policyRules ? { policyRules: [...parsed.policyRules] } : {}),
      ...(parsed.expiresAt !== undefined ? { expiresAt: parsed.expiresAt } : {}),
      status: "active",
      revokedAt: undefined,
      updatedAt: new Date().toISOString(),
    });

    if (!updated) {
      throw new CoreError(
        "API_KEY_ROTATION_FAILED",
        `API key "${id}" disappeared during rotation`,
      );
    }

    return {
      record: this.toPublicRecord(updated),
      apiKey: material.rawKey,
    };
  }

  async revoke(id: string, _reason?: string): Promise<ApiKeyPublicRecord | null> {
    const updated = await this.apiKeys.updateById(id, {
      status: "revoked",
      revokedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return updated ? this.toPublicRecord(updated) : null;
  }

  async authenticate(rawKey: string): Promise<ApiKeyAuthenticationResult> {
    const lookupId = this.hashing.extractLookupId(rawKey);
    if (!lookupId) {
      throw new CoreError("API_KEY_INVALID", "Invalid API key format");
    }

    const record = await this.apiKeys.findByLookupId(lookupId);
    if (!record || record.status !== "active") {
      throw new CoreError("API_KEY_INVALID", "Invalid API key");
    }
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
      throw new CoreError("API_KEY_EXPIRED", "API key has expired");
    }
    if (!this.hashing.verify(rawKey, record.secretHash)) {
      throw new CoreError("API_KEY_INVALID", "Invalid API key");
    }

    await this.apiKeys.updateById(record.id, {
      lastUsedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      subjectId: this.toSubjectId(record.id),
      record: this.toPublicRecord(record),
    };
  }

  async resolveAuthorizationRules(
    apiKeyId: string,
  ): Promise<readonly AuthorizationRule[]> {
    const record = await this.apiKeys.findById(apiKeyId);
    if (!record || record.status !== "active") {
      return [];
    }
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
      return [];
    }

    const roleRules = await this.resolveRoleRules(record.roleCodes);
    const directPermissionRules = await this.resolveDirectPermissionRules(
      record.permissionKeys,
    );
    const directPolicyRules: AuthorizationRule[] = record.policyRules.map((rule) => ({
      effect: rule.effect,
      permissionPattern: rule.permissionPattern,
      conditions: rule.conditions,
    }));

    return dedupeAuthorizationRules([
      ...roleRules,
      ...directPermissionRules,
      ...directPolicyRules,
    ]);
  }

  isApiKeySubject(subjectId: string): boolean {
    return subjectId.startsWith("api-key:");
  }

  toApiKeyId(subjectId: string): string {
    return subjectId.replace(/^api-key:/, "").trim();
  }

  private async resolveRoleRules(
    roleCodes: readonly string[],
  ): Promise<readonly AuthorizationRule[]> {
    if (roleCodes.length === 0) return [];

    const activeRoles = await Promise.all(
      roleCodes.map((roleCode) => this.roles.findByCode(roleCode)),
    );
    const activeRoleCodes = activeRoles
      .filter((role): role is NonNullable<typeof role> => Boolean(role))
      .filter((role) => role.status === "active")
      .map((role) => role.code);

    if (activeRoleCodes.length === 0) return [];

    const grants = await this.roleGrants.listByRoleCodes(activeRoleCodes);
    const permissionRules = await this.resolveDirectPermissionRules(
      grants.map((grant) => grant.permissionKey),
    );
    const policyRules = await this.rolePolicyRules.listByRoleCodes(activeRoleCodes);

    return dedupeAuthorizationRules([
      ...permissionRules,
      ...policyRules.map((rule) => ({
        effect: rule.effect,
        permissionPattern: rule.permissionPattern,
        conditions: rule.conditions,
      })),
    ]);
  }

  private async resolveDirectPermissionRules(
    permissionKeys: readonly string[],
  ): Promise<readonly AuthorizationRule[]> {
    const uniqueKeys = [...new Set(permissionKeys.map((item) => item.trim().toLowerCase()))];
    if (uniqueKeys.length === 0) return [];

    const permissionRecords = await Promise.all(
      uniqueKeys.map((key) => this.permissions.findByKey(key)),
    );

    return permissionRecords
      .filter((permission): permission is NonNullable<typeof permission> => Boolean(permission))
      .filter((permission) => permission.status === "active")
      .map(
        (permission) =>
          ({
            effect: "allow",
            permissionPattern: permission.key,
            conditions: [],
          }) satisfies AuthorizationRule,
      );
  }

  private async assertAssignmentsExist(input: {
    name?: string;
    description?: string;
    kind?: string;
    roleCodes?: readonly string[];
    permissionKeys?: readonly string[];
    policyRules?: readonly unknown[];
    expiresAt?: string;
  }): Promise<void> {
    for (const roleCode of input.roleCodes ?? []) {
      const role = await this.roles.findByCode(roleCode);
      if (!role) {
        throw new CoreError(
          "API_KEY_ROLE_NOT_FOUND",
          `Role "${roleCode}" not found for API key`,
        );
      }
    }

    for (const permissionKey of input.permissionKeys ?? []) {
      const permission = await this.permissions.findByKey(permissionKey);
      if (!permission) {
        throw new CoreError(
          "API_KEY_PERMISSION_NOT_FOUND",
          `Permission "${permissionKey}" not found for API key`,
        );
      }
    }
  }

  private toPublicRecord(record: ApiKeyRecord): ApiKeyPublicRecord {
    return ApiKeyPublicRecordSchema.parse({
      id: record.id,
      keyPrefix: record.keyPrefix,
      secretPreview: record.secretPreview,
      name: record.name,
      ...(record.description ? { description: record.description } : {}),
      kind: record.kind,
      status: record.status,
      roleCodes: record.roleCodes,
      permissionKeys: record.permissionKeys,
      policyRules: record.policyRules,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ...(record.lastUsedAt ? { lastUsedAt: record.lastUsedAt } : {}),
      ...(record.expiresAt ? { expiresAt: record.expiresAt } : {}),
      ...(record.revokedAt ? { revokedAt: record.revokedAt } : {}),
    });
  }

  private toSubjectId(apiKeyId: string): string {
    return `api-key:${apiKeyId}`;
  }
}
