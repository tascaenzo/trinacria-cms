import { type Infer, s } from "@trinacria-cms/kernel";

export const LoginAttemptRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    kind: s.literal("login_attempt"),
    key: s.string({ trim: true, minLength: 1 }),
    email: s.string({ trim: true, toLowerCase: true }),
    count: s.number(),
    lockoutUntil: s.dateTimeString().nullable().optional(),
    createdAt: s.dateTimeString(),
    updatedAt: s.dateTimeString()
  },
  { strict: true }
);

export type LoginAttemptRecord = Infer<typeof LoginAttemptRecordSchema>;
