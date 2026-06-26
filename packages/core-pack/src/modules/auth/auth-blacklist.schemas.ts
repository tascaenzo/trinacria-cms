import { s, type Infer } from "@trinacria-cms/kernel";

export const BlacklistedTokenRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    kind: s.literal("blacklist"),
    key: s.string({ trim: true, minLength: 1 }),
    sub: s.string({ trim: true, minLength: 1 }),
    iat: s.number(),
    tokenKind: s.enum(["access", "refresh"] as const),
    expiresAt: s.dateTimeString(),
    createdAt: s.dateTimeString()
  },
  { strict: true }
);

export type BlacklistedTokenRecord = Infer<typeof BlacklistedTokenRecordSchema>;
