import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { UsersService } from "@trinacria-cms/core-pack/runtime";
import type { DbAdapter } from "@trinacria-cms/kernel";
import type { OperationContext } from "@trinacria-cms/kernel/contracts";
import {
  assertOperationContext,
  createUserOperationContext,
  operationForbidden
} from "@trinacria-cms/kernel/runtime";
import { decodeProtectedHeader, jwtVerify, SignJWT } from "jose";
import type { EditorialEntryOperations } from "../../operations/editorial-entry-operations.js";
import type { ContentTypesRepository } from "../content-types/repositories/content-types.repository.js";
import type { EditorialDeliveryService } from "../publications/delivery.service.js";
import { type PreviewCredential, PreviewCredentialSchema } from "./preview.schemas.js";
import type { PreviewConfig } from "./preview-config.js";

export class PreviewUnavailableError extends Error {
  readonly code = "service_unavailable";
}
export class PreviewCredentialError extends Error {
  readonly code = "auth_preview_invalid";
}
const invalid = () => new PreviewCredentialError("Preview credential is invalid or expired");
const namespace = { pluginId: "editorial-pack" };
const hash = (sessionId: string) => createHash("sha256").update(sessionId).digest("hex");
/** Authenticated issuance, atomic single-use exchange and opaque, freshly authorized sessions. */
export class EditorialPreviewService {
  constructor(
    private readonly db: DbAdapter,
    private readonly config: PreviewConfig | null,
    private readonly users: Pick<UsersService, "getUserById">,
    private readonly entries: EditorialEntryOperations,
    private readonly types: ContentTypesRepository,
    private readonly delivery: EditorialDeliveryService,
    private readonly now = Date.now
  ) {}
  private settings() {
    if (!this.config) throw new PreviewUnavailableError("Preview is not configured");
    return this.config;
  }
  private async authorized(userId: string, entryId: string) {
    const user = await this.users.getUserById(userId);
    if (!user || user.status !== "active") throw invalid();
    const context = createUserOperationContext(userId);
    const entry = await this.entries.getEntry(context, entryId);
    if (!entry) throw invalid();
    return entry;
  }
  async sites(context: OperationContext) {
    assertOperationContext(context);
    if (context.actor.kind !== "user") throw operationForbidden("preview_user_required");
    const user = await this.users.getUserById(context.actor.subjectId);
    if (!user || user.status !== "active") throw invalid();
    await this.entries.listEntries(context, { limit: 1 });
    return [...(this.config?.sites ?? [])].map(([siteId, origin]) => ({ siteId, origin }));
  }
  async issue(context: OperationContext, entryId: string, siteId: string) {
    assertOperationContext(context);
    if (context.actor.kind !== "user") throw operationForbidden("preview_user_required");
    const settings = this.settings(),
      origin = settings.sites.get(siteId);
    if (!origin) throw invalid();
    const userId = context.actor.subjectId;
    await this.authorized(userId, entryId);
    const issuedAt = Math.floor(this.now() / 1000),
      jti = randomUUID(),
      expiresAt = issuedAt + 60;
    const token = await new SignJWT({ entryId, origin })
      .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: settings.activeKeyId })
      .setIssuer("trinacria-preview")
      .setSubject(userId)
      .setAudience(siteId)
      .setJti(jti)
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(settings.keys.get(settings.activeKeyId)!);
    await this.repository().insertOne({
      id: `token:${jti}`,
      kind: "token",
      userId,
      entryId,
      siteId,
      origin,
      expiresAt: new Date(expiresAt * 1000)
    });
    await this.authorized(userId, entryId);
    return {
      token,
      siteId,
      entryId,
      formAction: `${origin}/preview`,
      expiresAt: new Date(expiresAt * 1000).toISOString()
    };
  }
  async exchange(token: string, siteId: string, origin: string) {
    const settings = this.settings();
    if (!settings.sites.has(siteId) || settings.sites.get(siteId) !== origin || token.length > 4096)
      throw invalid();
    let claims: Awaited<ReturnType<typeof jwtVerify>>["payload"];
    try {
      const header = decodeProtectedHeader(token),
        key = typeof header.kid === "string" && settings.keys.get(header.kid);
      if (!key || header.typ !== "JWT" || header.alg !== "HS256") throw invalid();
      claims = (
        await jwtVerify(token, key, {
          algorithms: ["HS256"],
          issuer: "trinacria-preview",
          audience: siteId,
          currentDate: new Date(this.now()),
          requiredClaims: ["sub", "jti", "iat", "exp", "entryId", "origin"]
        })
      ).payload;
      if (
        typeof claims.sub !== "string" ||
        typeof claims.jti !== "string" ||
        typeof claims.entryId !== "string" ||
        claims.origin !== origin ||
        !Number.isSafeInteger(claims.iat) ||
        !Number.isSafeInteger(claims.exp) ||
        claims.exp! - claims.iat! !== 60 ||
        claims.iat! > Math.floor(this.now() / 1000)
      )
        throw invalid();
    } catch {
      throw invalid();
    }
    const userId = claims.sub!,
      entryId = claims.entryId as string;
    await this.authorized(userId, entryId);
    if (!this.db.withTransaction)
      throw new PreviewUnavailableError("Preview requires shared transactions");
    const sessionId = randomBytes(32).toString("base64url"),
      expiresAt = new Date(this.now() + 600000);
    await this.db.withTransaction(namespace, async (db) => {
      const repo = this.repository(db),
        id = `token:${claims.jti}`;
      const current = await repo.findOne({ filter: { id }, parse: PreviewCredentialSchema.parse });
      if (
        !current ||
        current.kind !== "token" ||
        current.userId !== userId ||
        current.entryId !== entryId ||
        current.siteId !== siteId ||
        current.origin !== origin ||
        current.consumedAt ||
        current.expiresAt.getTime() <= this.now()
      )
        throw invalid();
      if (
        !(await repo.updateOne(
          { filter: { id, consumedAt: { $exists: false } } },
          { consumedAt: new Date(this.now()) }
        ))
      )
        throw invalid();
      await repo.insertOne({
        id: `session:${hash(sessionId)}`,
        kind: "session",
        userId,
        entryId,
        siteId,
        origin,
        expiresAt
      });
      await this.authorized(userId, entryId);
    });
    return { sessionId, entryId, expiresAt: expiresAt.toISOString() };
  }
  private async session(sessionId: string, siteId: string, origin: string, entryId?: string) {
    const settings = this.settings();
    if (!/^[a-zA-Z0-9_-]{43}$/.test(sessionId) || settings.sites.get(siteId) !== origin)
      throw invalid();
    const session = await this.repository().findOne({
      filter: { id: `session:${hash(sessionId)}` },
      parse: PreviewCredentialSchema.parse
    });
    if (
      !session ||
      session.kind !== "session" ||
      session.siteId !== siteId ||
      session.origin !== origin ||
      (entryId && session.entryId !== entryId) ||
      session.expiresAt.getTime() <= this.now()
    )
      throw invalid();
    return session;
  }
  async read(sessionId: string, siteId: string, origin: string, entryId: string) {
    const session = await this.session(sessionId, siteId, origin, entryId);
    const entry = await this.authorized(session.userId, entryId),
      type = await this.types.findById(entry.contentTypeId);
    if (!type) throw invalid();
    const projection = await this.delivery.previewWorking(type, entry);
    if (!projection) throw invalid();
    await this.session(sessionId, siteId, origin, entryId);
    await this.authorized(session.userId, entryId);
    return projection;
  }
  async revoke(sessionId: string, siteId: string, origin: string) {
    const session = await this.session(sessionId, siteId, origin);
    await this.repository().deleteOne({ filter: { id: session.id } });
    return { revoked: true };
  }
  private repository(db = this.db) {
    return db.repository<PreviewCredential>("preview_credentials", namespace);
  }
}
