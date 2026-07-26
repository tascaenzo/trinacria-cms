import { defineEntity, type Infer, s } from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";

export const INSTALLATION_STATE_KEY = CORE_PACK_PLUGIN_ID;

export const PasswordAlgorithmSchema = s.literal("scrypt-v1");

/**
 * Singleton installation state for core-pack bootstrap flow.
 */
export const InstallationStateRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    kind: s.literal("install_state"),
    key: s.literal(INSTALLATION_STATE_KEY),
    installed: s.boolean(),
    installedAt: s.dateTimeString().optional(),
    adminUserId: s.string({ trim: true, minLength: 1 }).optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type InstallationStateRecord = Infer<typeof InstallationStateRecordSchema>;

/**
 * Local credentials record storing only password hash material.
 */
export const LocalCredentialRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    userId: s.string({ trim: true, minLength: 1 }),
    algorithm: PasswordAlgorithmSchema,
    passwordHash: s.string({ minLength: 20, maxLength: 500 }),
    passwordSalt: s.string({ minLength: 8, maxLength: 200 }),
    passwordUpdatedAt: s.dateTimeString(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type LocalCredentialRecord = Infer<typeof LocalCredentialRecordSchema>;

export const LOCAL_CREDENTIALS_ENTITY = defineEntity({
  entityName: "local_credentials",
  schema: LocalCredentialRecordSchema,
  indexes: [
    { fields: { id: 1 }, unique: true, name: "local_credentials_id_unique" },
    { fields: { userId: 1 }, unique: true, name: "local_credentials_user_id_unique" },
    { fields: { updatedAt: -1 }, name: "local_credentials_updated_at_desc_idx" }
  ] as const
});
