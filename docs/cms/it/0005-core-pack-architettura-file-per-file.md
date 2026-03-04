# 0005 - Core-pack file per file: users, ruoli, permessi, settings, modello embedded

Questo capitolo descrive la struttura di `packages/core-pack/src` dopo l'estensione authz avanzata.

## 1. Mappa package

- `modules/users/`: utenti
- `modules/roles/`: ruoli + grants embedded
- `modules/permissions/`: catalogo permessi
- `modules/security/`: provisioning, user access, authz, policy rules
- `modules/settings/`: definizioni, valori e segreti cifrati per plugin

## 2. Security module: file chiave

- `security-provisioning.service.ts`: sync manifest security
- `user-roles.schemas.ts` / `user-roles.repository.ts` (assegnazioni embedded in `users`)
- `role-policy-rules.schemas.ts` / `role-policy-rules.repository.ts`
- `user-access.service.ts`
- `user-access.controller.ts`
- `core-pack-authz.service.ts`

## 3. Nuove responsabilita

1. gestire assegnazioni ruolo utente senza collection join (`users.roleAssignments[]`)
2. supportare policy rules role-based (`allow`/`deny`, wildcard, condizioni)
3. risolvere regole authz finali per utente
4. esporre `CORE_TOKENS.AUTHZ_SERVICE`
5. supportare configurazioni plugin (`settings`) con isolamento forte sui secrets

## 4. Entita security attuali

- `permissions`
- `roles`
- `role_policy_rules`

Relazioni embedded:

- `roles.permissionGrants[]` (sostituisce `role_grants`)
- `users.roleAssignments[]` (sostituisce `user_roles`)

## 5. Modulo settings: file chiave

- `settings.schemas.ts`: 3 entita (`settings_definitions`, `settings_values`, `settings_secrets`) e relativi indici.
- `settings.service.ts`: logica applicativa (ownership key, fallback default, masking secrets).
- `settings-secrets-crypto.service.ts`: cifratura/decifratura AES-256-GCM.
- `settings-plugin-auth.ts`: canonicalizzazione richiesta + firma HMAC-SHA256.
- `settings-plugin-auth-key-provider.ts`: contratto `PluginAuthKeyProvider` + provider default da env.
- `settings-plugin-auth.service.ts`: verifica timestamp/nonce/signature e anti-replay.
- `settings-plugin-auth.middleware.ts`: inserisce il caller plugin autenticato in `ctx.state`.
- `settings.controller.ts`: API REST e enforcement middleware sulle route sensibili.

## 6. Protocollo autenticazione chiamante plugin (settings)

Header richiesti:

- `x-cms-plugin-id`
- `x-cms-plugin-ts`
- `x-cms-plugin-nonce`
- `x-cms-plugin-signature`

Firma (concetto):

1. canonical string con `METHOD`, `PATH`, `timestamp`, `nonce`, `pluginId`, `sha256(body)`;
2. HMAC-SHA256 con secret condiviso per plugin;
3. server verifica firma + skew temporale + nonce non riutilizzato.

Configurazione runtime:

- `CMS_PLUGIN_AUTH_KEYS_JSON`: mappa `{ pluginId: secret }`
- `CMS_PLUGIN_AUTH_MAX_SKEW_SECONDS`: tolleranza clock (default 300s)
- `PluginAuthKeyProvider`: punto di estensione DI per leggere secret da Vault/KMS invece che da env.

Effetto pratico:

- nessun plugin puo impersonare un altro plugin sulle route settings protette;
- i secrets restano leggibili solo dal plugin owner (isolamento forte, non solo logico).

## 7. Conclusione

`core-pack` e ora un plugin IAM + configuration completo, con authz avanzato, provisioning manifest-driven e isolamento forte dei secrets tramite autenticazione firmata del caller plugin.
