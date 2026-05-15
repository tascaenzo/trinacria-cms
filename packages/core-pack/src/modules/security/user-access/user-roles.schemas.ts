import { s, type Infer } from "@trinacria-cms/kernel";

/**
 * Embedded assignment payload stored inside a user document.
 * `sourcePluginId` tracks assignment ownership for plugin cleanup.
 */
export const EmbeddedUserRoleSchema = s.object(
  {
    roleCode: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/
    }),
    sourcePluginId: s.string({ trim: true, minLength: 1 }),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type EmbeddedUserRole = Infer<typeof EmbeddedUserRoleSchema>;

/**
 * API-facing relation record linking one user to one role.
 * It is derived from embedded assignments and keeps backward-compatible shape.
 */
export const UserRoleRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    userId: s.string({ trim: true, minLength: 1 }),
    roleCode: s.string({
      trim: true,
      toLowerCase: true,
      minLength: 2,
      maxLength: 64,
      pattern: /^[a-z0-9][a-z0-9._-]*$/
    }),
    sourcePluginId: s.string({ trim: true, minLength: 1 }),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type UserRoleRecord = Infer<typeof UserRoleRecordSchema>;
