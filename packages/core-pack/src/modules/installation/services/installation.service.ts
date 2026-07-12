import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PluginSecurityProvisioner } from "@trinacria-cms/kernel";
import type { EventBus } from "@trinacria/events";
import { CORE_PACK_MANIFEST } from "../../../plugin/core-pack.manifest.js";
import { CORE_PACK_ADMIN_ROLE } from "../../../plugin/core-pack.security.js";
import { SettingsService } from "../../settings/services/settings.service.js";
import { UserAccessService } from "../../security/user-access/user-access.service.js";
import { UserLifecycleEventPublisher } from "../../users/services/user-lifecycle-event-publisher.js";
import { UsersRepository } from "../../users/repositories/users.repository.js";
import type { UserRecord } from "../../users/users.schemas.js";
import type { InstallBootstrapInput } from "../dto/installation.input.dto.js";
import { InstallationStateRepository } from "../repositories/installation-state.repository.js";
import { LocalCredentialsRepository } from "../repositories/local-credentials.repository.js";
import { PasswordHashingService } from "./password-hashing.service.js";

export interface InstallationStatus {
  installed: boolean;
  installedAt?: string;
  adminUserId?: string;
  envFilePresent: boolean;
  dbConfigured: boolean;
  envFilePath: string;
}

export interface InstallationBootstrapResult {
  status: InstallationStatus;
  adminUser: UserRecord;
}

/**
 * Typed error used when bootstrap is requested after installation completion.
 */
export class InstallationAlreadyCompletedError extends Error {
  readonly code = "installation_already_completed" as const;

  constructor() {
    super("CMS installation has already been completed");
  }
}

export class PasswordMismatchError extends Error {
  readonly code = "password_mismatch" as const;

  constructor() {
    super("Password and confirmation do not match");
  }
}

/**
 * Coordinates the one-time CMS bootstrap flow:
 * - ensure security baseline exists
 * - create/reactivate admin user
 * - store local credentials hash
 * - attach admin role
 * - save site settings
 * - persist installation state
 *
 * MongoDB is expected to be pre-configured via .env at application startup.
 */
export class InstallationService {
  private readonly userEvents: UserLifecycleEventPublisher;

  constructor(
    private readonly installationState: InstallationStateRepository,
    private readonly localCredentials: LocalCredentialsRepository,
    private readonly users: UsersRepository,
    private readonly userAccess: UserAccessService,
    private readonly securityProvisioning: PluginSecurityProvisioner,
    private readonly passwordHashing: PasswordHashingService,
    private readonly settings: SettingsService,
    events?: EventBus
  ) {
    this.userEvents = new UserLifecycleEventPublisher(events);
  }

  async getStatus(): Promise<InstallationStatus> {
    const envStatus = readInstallationEnvironmentStatus();
    try {
      const state = await this.installationState.ensureCreated();
      return this.toStatus(state, envStatus);
    } catch {
      return {
        installed: false,
        envFilePresent: envStatus.envFilePresent,
        dbConfigured: envStatus.dbConfigured,
        envFilePath: envStatus.envFilePath
      };
    }
  }

  async bootstrap(input: InstallBootstrapInput): Promise<InstallationBootstrapResult> {
    const state = await this.installationState.ensureCreated();
    if (state.installed) {
      throw new InstallationAlreadyCompletedError();
    }

    // Validate password confirmation
    if (input.password !== input.confirmPassword) {
      throw new PasswordMismatchError();
    }

    // Security baseline
    await this.securityProvisioning.provision(CORE_PACK_MANIFEST);
    await this.securityProvisioning.provisionDeferred?.();

    // Admin user
    const adminUser = await this.upsertAdminUser(input);
    const password = await this.passwordHashing.hashPassword(input.password);
    await this.localCredentials.upsert({
      userId: adminUser.id,
      algorithm: password.algorithm,
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt
    });

    await this.userAccess.assignRoleToUser(adminUser.id, CORE_PACK_ADMIN_ROLE.code);

    // Site settings
    await this.provisionSiteSettings(input, adminUser.id);

    // Mark installed
    const installed = await this.installationState.markInstalled(adminUser.id);
    return {
      status: this.toStatus(installed, readInstallationEnvironmentStatus()),
      adminUser
    };
  }

  private async provisionSiteSettings(
    input: InstallBootstrapInput,
    adminUserId: string
  ): Promise<void> {
    if (input.siteName) {
      try {
        await this.settings.upsertValue({
          requesterPluginId: "core-pack",
          key: "core-pack:site:name",
          value: input.siteName,
          updatedBy: adminUserId
        });
      } catch {
        // Settings provisioning is non-fatal for bootstrap
      }
    }
    if (input.siteTagline) {
      try {
        await this.settings.upsertValue({
          requesterPluginId: "core-pack",
          key: "core-pack:branding:tagline",
          value: input.siteTagline,
          updatedBy: adminUserId
        });
      } catch {
        // non-fatal
      }
    }
    if (input.locale) {
      try {
        await this.settings.upsertValue({
          requesterPluginId: "core-pack",
          key: "core-pack:cms:locale",
          value: input.locale,
          updatedBy: adminUserId
        });
      } catch {
        // non-fatal
      }
    }
    if (input.timezone) {
      try {
        await this.settings.upsertValue({
          requesterPluginId: "core-pack",
          key: "core-pack:cms:timezone",
          value: input.timezone,
          updatedBy: adminUserId
        });
      } catch {
        // non-fatal
      }
    }
  }

  private async upsertAdminUser(input: InstallBootstrapInput): Promise<UserRecord> {
    const existing = await this.users.findByEmail(input.email);
    if (!existing) {
      const created = await this.users.create({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName
      });
      await this.userEvents.userCreated({
        userId: created.id,
        status: created.status,
        source: "system"
      });
      return created;
    }

    if (existing.status === "active") {
      return existing;
    }

    const reactivated = await this.users.updateStatus(existing.id, {
      status: "active"
    });
    if (!reactivated) {
      throw new Error(`User "${existing.id}" disappeared during activation`);
    }
    await this.userEvents.userStatusChanged({
      userId: reactivated.id,
      previousStatus: existing.status,
      status: reactivated.status,
      reason: "system"
    });
    return reactivated;
  }

  private toStatus(
    state: {
      installed: boolean;
      installedAt?: string;
      adminUserId?: string;
    },
    envStatus: { envFilePresent: boolean; dbConfigured: boolean; envFilePath: string }
  ): InstallationStatus {
    return {
      installed: state.installed,
      installedAt: state.installedAt,
      adminUserId: state.adminUserId,
      envFilePresent: envStatus.envFilePresent,
      dbConfigured: envStatus.dbConfigured,
      envFilePath: envStatus.envFilePath
    };
  }
}

function resolveEnvFilePath(): string {
  const customPath = process.env.CMS_ENV_FILE?.trim();
  if (customPath) {
    return customPath;
  }
  return join(process.cwd(), ".env");
}

function readInstallationEnvironmentStatus(): {
  envFilePresent: boolean;
  dbConfigured: boolean;
  envFilePath: string;
} {
  const envFilePath = resolveEnvFilePath();
  const envFilePresent = existsSync(envFilePath);
  const mongoUri = process.env.MONGO_URI?.trim();
  const mongoHost = process.env.MONGO_HOST?.trim();
  const mongoPort = process.env.MONGO_PORT?.trim();
  const mongoDatabase = process.env.MONGO_DATABASE?.trim();

  const dbConfigured = Boolean(
    (mongoUri && mongoUri.length > 0) || (mongoHost && mongoPort && mongoDatabase)
  );

  return {
    envFilePresent,
    dbConfigured,
    envFilePath
  };
}
