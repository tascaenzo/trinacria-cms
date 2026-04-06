import type { PluginSecurityProvisioner } from "@trinacria-cms/kernel";
import { CORE_PACK_ADMIN_ROLE } from "../../plugin/core-pack.security.js";
import { CORE_PACK_MANIFEST } from "../../plugin/core-pack.manifest.js";
import { UsersRepository } from "../users/users.repository.js";
import type { UserRecord } from "../users/users.schemas.js";
import { UserAccessService } from "../security/user-access/user-access.service.js";
import type { InstallBootstrapInput } from "./dto/installation.input.dto.js";
import { InstallationStateRepository } from "./installation-state.repository.js";
import { LocalCredentialsRepository } from "./local-credentials.repository.js";
import { PasswordHashingService } from "./password-hashing.service.js";

export interface InstallationStatus {
  installed: boolean;
  installedAt?: string;
  adminUserId?: string;
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

/**
 * Coordinates the one-time CMS bootstrap flow:
 * - ensure security baseline exists
 * - create/reactivate admin user
 * - store local credentials hash
 * - attach admin role and persist installation state
 */
export class InstallationService {
  constructor(
    private readonly installationState: InstallationStateRepository,
    private readonly localCredentials: LocalCredentialsRepository,
    private readonly users: UsersRepository,
    private readonly userAccess: UserAccessService,
    private readonly securityProvisioning: PluginSecurityProvisioner,
    private readonly passwordHashing: PasswordHashingService,
  ) {}

  async getStatus(): Promise<InstallationStatus> {
    const state = await this.installationState.ensureCreated();
    return this.toStatus(state);
  }

  async bootstrap(input: InstallBootstrapInput): Promise<InstallationBootstrapResult> {
    const state = await this.installationState.ensureCreated();
    if (state.installed) {
      throw new InstallationAlreadyCompletedError();
    }

    await this.securityProvisioning.provision(CORE_PACK_MANIFEST);

    const adminUser = await this.upsertAdminUser(input);
    const password = await this.passwordHashing.hashPassword(input.password);
    await this.localCredentials.upsert({
      userId: adminUser.id,
      algorithm: password.algorithm,
      passwordHash: password.passwordHash,
      passwordSalt: password.passwordSalt,
    });

    await this.userAccess.assignRoleToUser(adminUser.id, CORE_PACK_ADMIN_ROLE.code);
    const installed = await this.installationState.markInstalled(adminUser.id);

    return {
      status: this.toStatus(installed),
      adminUser,
    };
  }

  private async upsertAdminUser(input: InstallBootstrapInput): Promise<UserRecord> {
    const existing = await this.users.findByEmail(input.email);
    if (!existing) {
      return this.users.create({
        email: input.email,
        displayName: input.displayName,
      });
    }

    if (existing.status === "active") {
      return existing;
    }

    const reactivated = await this.users.updateStatus(existing.id, {
      status: "active",
    });
    if (!reactivated) {
      throw new Error(`User "${existing.id}" disappeared during activation`);
    }
    return reactivated;
  }

  private toStatus(state: {
    installed: boolean;
    installedAt?: string;
    adminUserId?: string;
  }): InstallationStatus {
    return {
      installed: state.installed,
      installedAt: state.installedAt,
      adminUserId: state.adminUserId,
    };
  }
}
