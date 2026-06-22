import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

export const UserStatusSchema = s.enum(["active", "suspended"] as const);

export const UserRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    email: s.string({ trim: true, toLowerCase: true, email: true }),
    firstName: s.string({ trim: true, minLength: 1, maxLength: 60 }),
    lastName: s.string({ trim: true, minLength: 1, maxLength: 60 }),
    status: UserStatusSchema,
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type UserRecord = Infer<typeof UserRecordSchema>;

/**
 * Canonical users entity declaration.
 * It co-locates schema + logical indexes to keep plugin authoring simple.
 */
export const USERS_ENTITY = defineEntity({
  entityName: "users",
  schema: UserRecordSchema,
  indexes: [
    {
      fields: { id: 1 },
      unique: true,
      name: "users_id_unique"
    },
    {
      fields: { email: 1 },
      unique: true,
      name: "users_email_unique"
    },
    {
      fields: { status: 1 },
      name: "users_status_idx"
    }
  ] as const
});
