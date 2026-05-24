import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

export const LoginAttemptRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    email: s.string({ trim: true, toLowerCase: true }),
    count: s.number(),
    lockoutUntil: s.dateTimeString().nullable().optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type LoginAttemptRecord = Infer<typeof LoginAttemptRecordSchema>;

export const LOGIN_ATTEMPT_ENTITY = defineEntity({
  entityName: "login_attempts",
  schema: LoginAttemptRecordSchema,
  indexes: [
    {
      fields: { id: 1 },
      unique: true,
      name: "login_attempts_id_unique"
    },
    {
      fields: { email: 1 },
      unique: true,
      name: "login_attempts_email_unique"
    }
  ] as const
});
