import { type Infer, s } from "@trinacria-cms/kernel";
import { defineEntity } from "@trinacria-cms/kernel/runtime";

export const PreviewCredentialSchema = s.object(
  {
    id: s.string(),
    kind: s.enum(["token", "session"] as const),
    userId: s.string(),
    entryId: s.string(),
    siteId: s.string(),
    origin: s.string(),
    expiresAt: s.date(),
    consumedAt: s.date().optional()
  },
  { strict: true }
);
export type PreviewCredential = Infer<typeof PreviewCredentialSchema>;
export const PREVIEW_CREDENTIALS_ENTITY = defineEntity({
  ownerPluginId: "editorial-pack",
  entityName: "preview_credentials",
  schema: PreviewCredentialSchema,
  indexes: [
    { name: "preview_credentials_id", fields: { id: 1 }, unique: true },
    { name: "preview_credentials_ttl", fields: { expiresAt: 1 }, expireAfterSeconds: 0 }
  ]
});
