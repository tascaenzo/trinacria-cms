import { factoryProvider, type TrinacriaApp } from "@trinacria/core";
import type { CmsStarterOptions } from "../../contracts/cms-starter.js";
import type { SecureEventPayloadAuthorizer } from "../../contracts/secure-event-payloads.js";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";
import {
  readSecurePayloadKeyring,
  SecureEventPayloadCrypto
} from "../secure-payloads/secure-event-payloads.crypto.js";
import { SecureEventPayloadError } from "../secure-payloads/secure-event-payloads.errors.js";
import { SecureEventPayloadsRepository } from "../secure-payloads/secure-event-payloads.repository.js";
import { SECURE_EVENT_PAYLOADS_ENTITY } from "../secure-payloads/secure-event-payloads.schemas.js";
import { SecureEventPayloadsService } from "../secure-payloads/secure-event-payloads.service.js";

export function registerSecurePayloadHostProvider(
  app: TrinacriaApp,
  options: CmsStarterOptions
): void {
  if (
    !app.hasToken(CORE_TOKENS.DB_ADAPTER) ||
    app.hasToken(CORE_TOKENS.SECURE_EVENT_PAYLOAD_HOST)
  ) {
    return;
  }

  const retentionMs =
    options.securePayloads?.retentionMs ??
    (process.env.CMS_SECURE_PAYLOAD_RETENTION_MS === undefined
      ? undefined
      : Number(process.env.CMS_SECURE_PAYLOAD_RETENTION_MS));
  if (retentionMs !== undefined && (!Number.isSafeInteger(retentionMs) || retentionMs < 1))
    throw new SecureEventPayloadError(
      "secure_event_payload_configuration_invalid",
      "Secure payload retention must be a positive integer in milliseconds"
    );
  app.registerGlobalProvider(
    factoryProvider(CORE_TOKENS.SECURE_EVENT_PAYLOAD_HOST, async () => {
      const dbAdapter = await app.resolve(CORE_TOKENS.DB_ADAPTER);
      if (options.migrations?.allowStartupWithoutDb && !(await dbAdapter.healthCheck()).ok) {
        const unavailable = async () => {
          throw new SecureEventPayloadError(
            "platform_maintenance",
            "Secure payloads require a connected transactional host and restart"
          );
        };
        return {
          forPlugin: () => ({ create: unavailable, claim: unavailable, revoke: unavailable })
        };
      }
      const crypto = new SecureEventPayloadCrypto(
        options.securePayloads?.keyring ?? readSecurePayloadKeyring()
      );
      if (app.hasToken(CORE_TOKENS.ENTITY_REGISTRY)) {
        const registry = await app.resolve(CORE_TOKENS.ENTITY_REGISTRY);
        registry.register(SECURE_EVENT_PAYLOADS_ENTITY);
      }
      const repository = new SecureEventPayloadsRepository(dbAdapter);
      await repository.initialize();
      // Core can register its policy after Auth first resolves this host singleton.
      // Resolve at each evaluation, including CAS retries; never cache absence/grants.
      const authorizer: SecureEventPayloadAuthorizer = {
        async canClaim(request) {
          if (!app.hasToken(CORE_TOKENS.SECURE_EVENT_PAYLOAD_AUTHORIZER)) return { allowed: false };
          const policy = await app.resolve(CORE_TOKENS.SECURE_EVENT_PAYLOAD_AUTHORIZER);
          return policy.canClaim(request);
        }
      };
      return new SecureEventPayloadsService(repository, crypto, authorizer, { retentionMs });
    }, [])
  );
}
