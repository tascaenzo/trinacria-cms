import { defineEntity, s, type Infer } from "@trinacria-cms/kernel";

export const BlacklistedTokenRecordSchema = s.object(
  {
    id: s.string({ trim: true, minLength: 1 }),
    sub: s.string({ trim: true, minLength: 1 }),
    iat: s.number(),
    kind: s.enum(["access", "refresh"] as const),
    expiresAt: s.dateTimeString(),
    createdAt: s.dateTimeString()
  },
  { strict: true }
);

export type BlacklistedTokenRecord = Infer<typeof BlacklistedTokenRecordSchema>;

export const BLACKLISTED_TOKEN_ENTITY = defineEntity({
  entityName: "blacklisted_tokens",
  schema: BlacklistedTokenRecordSchema,
  indexes: [
    {
      fields: { id: 1 },
      unique: true,
      name: "blacklisted_tokens_id_unique"
    },
    {
      fields: { sub: 1, iat: 1 },
      name: "blacklisted_tokens_sub_iat_idx"
    },
    {
      fields: { expiresAt: 1 },
      name: "blacklisted_tokens_expires_at_idx"
    }
  ] as const
});
