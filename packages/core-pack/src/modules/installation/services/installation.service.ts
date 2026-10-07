import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  DbAdapter,
  InstallationCheck,
  InstallationHost,
  PluginEventPublisher,
  PluginManifestProvisioner
} from "@trinacria-cms/kernel";
import {
  type MongoDurableEventStore,
  type PlatformLease,
  PlatformLocks
} from "@trinacria-cms/kernel/runtime";
import { CORE_PACK_ADMIN_I18N_SOURCES } from "../../../admin-i18n/index.js";
import { CORE_PACK_MANIFEST } from "../../../plugin/core-pack.manifest.js";
import { CORE_PACK_ADMIN_ROLE } from "../../../plugin/core-pack.security.js";
import type { UserAccessService } from "../../security/user-access/user-access.service.js";
import { SettingsDefinitionsRepository } from "../../settings/definitions/settings-definitions.repository.js";
import { SettingsSecretsRepository } from "../../settings/secrets/settings-secrets.repository.js";
import type { SettingsService } from "../../settings/services/settings.service.js";
import { SettingsValuesRepository } from "../../settings/values/settings-values.repository.js";
import { UsersRepository } from "../../users/repositories/users.repository.js";
import { UserLifecycleEventPublisher } from "../../users/services/user-lifecycle-event-publisher.js";
import type { UserRecord } from "../../users/users.schemas.js";
import type { InstallBootstrapInput } from "../dto/installation.input.dto.js";
import type { InstallationStateRecord } from "../installation.schemas.js";
import { InstallationStateRepository } from "../repositories/installation-state.repository.js";
import { LocalCredentialsRepository } from "../repositories/local-credentials.repository.js";
import type { PasswordHashingService } from "./password-hashing.service.js";

export interface InstallationStatus {
  installed: boolean;
  phase: "prerequisites" | "ready" | "configuration" | "content" | "verification" | "complete";
  canInstall: boolean;
  restartRequired: boolean;
  dataMode?: "empty" | "demo";
  checks: readonly InstallationCheck[];
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
 * Host prerequisites determine readiness; interrupted attempts remain retryable.
 */
export class InstallationService {
  constructor(
    private readonly installationState: InstallationStateRepository,
    private readonly localCredentials: LocalCredentialsRepository,
    private readonly users: UsersRepository,
    private readonly userAccess: UserAccessService,
    private readonly manifestProvisioning: PluginManifestProvisioner,
    private readonly passwordHashing: PasswordHashingService,
    private readonly settings: SettingsService,
    private readonly durable?: MongoDurableEventStore,
    private readonly host?: InstallationHost
  ) {}

  async getStatus(): Promise<InstallationStatus> {
    const checks = (await this.host?.inspect())?.checks ?? [];
    try {
      const state = await this.installationState.get();
      return this.toStatus(state ?? { installed: false }, checks);
    } catch {
      return this.toStatus({ installed: false }, [
        ...checks.filter((check) => check.id !== "database"),
        { id: "database", status: "fail", message: "configure-mongo" }
      ]);
    }
  }

  async bootstrap(input: InstallBootstrapInput): Promise<InstallationBootstrapResult> {
    if (input.password !== input.confirmPassword) throw new PasswordMismatchError();
    if ((await this.host?.inspect())?.checks.some((check) => check.status !== "pass"))
      throw Object.assign(new Error("Resolve the installation prerequisites before continuing"), {
        code: "platform_maintenance"
      });
    const db = this.installationState.getAdapter();
    const locks = new PlatformLocks(db);
    const lease = await locks.acquire("cms-installation", randomUUID());
    if (!lease)
      throw Object.assign(
        new Error("Another installation is already running. Retry after it finishes."),
        { code: "installation_in_progress" }
      );
    let leaseFailure: unknown;
    let renewal = Promise.resolve();
    const heartbeat = setInterval(() => {
      renewal = renewal
        .then(() => locks.renew(lease))
        .catch((error) => {
          leaseFailure = error;
        });
    }, 10000);
    heartbeat.unref();
    const assertLease = () => {
      if (leaseFailure) throw leaseFailure;
    };
    try {
      const state = await this.installationState.ensureCreated();
      if (state.installed) throw new InstallationAlreadyCompletedError();
      const dataMode = input.dataMode ?? "empty";
      // A resumed attempt must prove ownership of the admin created by the first attempt.
      if (state.adminUserId) {
        const credential = await this.localCredentials.findByUserId(state.adminUserId);
        if (
          state.adminEmail !== input.email ||
          state.dataMode !== dataMode ||
          !credential ||
          !(await this.passwordHashing.verifyPassword(input.password, credential))
        )
          throw Object.assign(
            new Error("Resume with the original administrator credentials and content choice"),
            { code: "installation_resume_mismatch" }
          );
      }
      await this.manifestProvisioning.provision(CORE_PACK_MANIFEST, CORE_PACK_ADMIN_I18N_SOURCES);
      await this.manifestProvisioning.provisionDeferred?.();
      assertLease();
      const password = await this.passwordHashing.hashPassword(input.password);
      const adminUser = await this.transaction(locks, lease, async (transactionDb, publisher) => {
        const users = transactionDb ? new UsersRepository(transactionDb) : this.users;
        const credentials = transactionDb
          ? new LocalCredentialsRepository(transactionDb)
          : this.localCredentials;
        const access = transactionDb ? this.userAccess.forDb(transactionDb) : this.userAccess;
        const settings = transactionDb
          ? this.settings.forRepositories(
              new SettingsDefinitionsRepository(transactionDb),
              new SettingsValuesRepository(transactionDb),
              new SettingsSecretsRepository(transactionDb)
            )
          : this.settings;
        const installation = transactionDb
          ? new InstallationStateRepository(transactionDb)
          : this.installationState;
        const user = await this.writeAdminUser(
          input,
          users,
          new UserLifecycleEventPublisher(publisher)
        );
        await credentials.upsert({ userId: user.id, ...password });
        await access.assignRoleToUser(user.id, CORE_PACK_ADMIN_ROLE.code);
        await this.provisionSiteSettings(input, user.id, settings);
        await installation.checkpoint({
          phase: "content",
          dataMode,
          adminEmail: input.email,
          adminUserId: user.id
        });
        return user;
      });
      assertLease();
      await this.host?.initialize({ dataMode, adminUserId: adminUser.id });
      assertLease();
      await this.transaction(locks, lease, async (transactionDb) => {
        await (transactionDb
          ? new InstallationStateRepository(transactionDb)
          : this.installationState
        ).checkpoint({ phase: "verification" });
      });
      const checks = await this.verify(input, adminUser.id);
      if (checks.some((check) => check.status !== "pass"))
        throw Object.assign(
          new Error(
            "Installation verification failed. Check the services and retry with the same administrator."
          ),
          { code: "platform_maintenance" }
        );
      assertLease();
      const installed = await this.transaction(locks, lease, (transactionDb) =>
        (transactionDb
          ? new InstallationStateRepository(transactionDb)
          : this.installationState
        ).markInstalled(adminUser.id)
      );
      return {
        status: this.toStatus(installed, checks),
        adminUser: (await this.users.findById(adminUser.id)) ?? adminUser
      };
    } finally {
      clearInterval(heartbeat);
      await renewal;
      await locks.release(lease).catch(() => {});
    }
  }

  private async transaction<T>(
    locks: PlatformLocks,
    lease: PlatformLease,
    work: (db?: DbAdapter, publisher?: PluginEventPublisher) => Promise<T>
  ): Promise<T> {
    if (!this.durable) return work();
    return this.durable.transactionWithKernel("core-pack", async (db, publisher, repositories) => {
      await locks.fence(repositories, lease);
      return work(db, publisher);
    });
  }

  private siteValues(input: InstallBootstrapInput): [string, string][] {
    return [
      ["core-pack:site:name", input.siteName],
      ["core-pack:branding:tagline", input.siteTagline ?? ""],
      ["core-pack:cms:locale", input.locale ?? "en-US"],
      ["core-pack:cms:timezone", input.timezone ?? "UTC"]
    ];
  }

  private async provisionSiteSettings(
    input: InstallBootstrapInput,
    adminUserId: string,
    settings: SettingsService
  ): Promise<void> {
    for (const [key, value] of this.siteValues(input))
      await settings.upsertValue({
        requesterPluginId: "core-pack",
        key,
        value,
        updatedBy: adminUserId
      });
  }

  private async verify(
    input: InstallBootstrapInput,
    adminUserId: string
  ): Promise<InstallationCheck[]> {
    const checks = [
      ...((await this.host?.inspect())?.checks ?? []),
      ...((await this.host?.verify()) ?? [])
    ];
    const user = await this.users.findById(adminUserId);
    const credential = await this.localCredentials.findByUserId(adminUserId);
    const roles = await this.userAccess.listUserRoles(adminUserId);
    const adminReady =
      user?.status === "active" &&
      roles.some((role) => role.roleCode === "admin") &&
      credential &&
      (await this.passwordHashing.verifyPassword(input.password, credential));
    checks.push({
      id: "administrator",
      status: adminReady ? "pass" : "fail",
      message: adminReady ? "administrator-ready" : "administrator-not-ready"
    });
    const values = await Promise.all(
      this.siteValues(input).map(
        async ([key, expected]) =>
          (await this.settings.getResolvedValueByKey(key))?.value === expected
      )
    );
    checks.push({
      id: "settings",
      status: values.every(Boolean) ? "pass" : "fail",
      message: values.every(Boolean) ? "settings-ready" : "settings-not-ready"
    });
    return checks;
  }

  private async writeAdminUser(
    input: InstallBootstrapInput,
    users: UsersRepository,
    events: UserLifecycleEventPublisher
  ): Promise<UserRecord> {
    const existing = await users.findByEmail(input.email);
    if (!existing) {
      const created = await users.create({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName
      });
      await events.userCreated({
        userId: created.id,
        status: created.status,
        source: "system"
      });
      return created;
    }

    if (existing.status === "active") {
      return existing;
    }

    const reactivated = await users.updateStatus(existing.id, {
      status: "active"
    });
    if (!reactivated) {
      throw new Error(`User "${existing.id}" disappeared during activation`);
    }
    await events.userStatusChanged({
      userId: reactivated.id,
      previousStatus: existing.status,
      status: reactivated.status,
      reason: "system"
    });
    return reactivated;
  }

  private toStatus(
    state: Pick<InstallationStateRecord, "installed"> & Partial<InstallationStateRecord>,
    checks: readonly InstallationCheck[]
  ): InstallationStatus {
    const ready = checks.every((check) => check.status === "pass");
    return {
      ...readInstallationEnvironmentStatus(),
      installed: state.installed,
      installedAt: state.installedAt,
      adminUserId: state.adminUserId,
      phase: state.installed ? "complete" : !ready ? "prerequisites" : (state.phase ?? "ready"),
      dataMode: state.dataMode,
      canInstall: !state.installed && ready,
      restartRequired: false,
      checks
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

export function readInstallationEnvironmentStatus(): {
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
