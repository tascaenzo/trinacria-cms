# 0018 - Milestone: Settings Runtime Hardening

Questa milestone chiude l'indurimento operativo del sistema settings con focus su:

- ownership forte delle chiavi setting nel manifest plugin;
- enforcement runtime delle policy setting (`status`, `visibility`, `mutable`, `secret`);
- hardening dell'autenticazione plugin per settings;
- osservabilita base per capire subito anomalie operative.

## Obiettivi

1. Evitare che un plugin dichiari o modifichi chiavi non proprie.
2. Rendere effettive a runtime le policy dichiarate dai setting.
3. Migliorare robustezza auth plugin (nonce replay + key rotation).
4. Esporre contatori operativi per debugging rapido.

## Scope implementato

### 1) Ownership enforcement nel manifest (kernel)

In validazione manifest, ogni `settings.key` deve appartenere al plugin:

- formato richiesto: `<pluginId>:<domain>:<name>`;
- vincolo aggiuntivo: `settings.key` deve iniziare con `manifest.id:`.

Effetto: un plugin non puo registrare chiavi di altri plugin.

### 2) Policy settings rese operative (core-pack)

Il modello definition ora governa esplicitamente:

- `status`: `active | disabled`
- `visibility`: `public | admin | internal`
- `mutable`: `boolean`
- `secret`: `boolean`

Regole runtime introdotte:

- write value consentito solo se definition `active`, `mutable=true`, `secret=false`;
- write secret consentito solo se definition `active`, `mutable=true`, `secret=true`;
- read lato plugin vincolata da `visibility` e ownership;
- read secret/reveal secret sempre owner-scoped per plugin caller.

### 3) Plugin auth hardening (settings)

`SettingsPluginAuthService` ora supporta:

- key-ring per plugin (piu segreti validi in parallelo);
- metriche auth runtime:
  - `successes`
  - `failures`
  - `replays`

Questo abilita rotazione chiavi senza downtime.

### 4) Observability endpoint

Aggiunto endpoint admin-only:

- `GET /v1/settings/observability`

Risposta con contatori runtime:

- settings service: `reads`, `writes`, `denies`, `errors`
- plugin auth: `successes`, `failures`, `replays`

Nota: contatori in-memory (reset al restart).

## API/Contratto aggiornato

Definition upsert/response include ora policy fields:

- `status`
- `visibility`
- `mutable`
- `secret`

Le policy vengono propagate anche dal provisioning plugin manifest -> settings definition.

## File principali toccati

- `packages/kernel/src/runtime/plugin-manifest/plugin-manifest-validation.ts`
- `packages/core-pack/src/modules/settings/settings.service.ts`
- `packages/core-pack/src/modules/settings/settings.controller.ts`
- `packages/core-pack/src/modules/settings/schemas/settings.schemas.ts`
- `packages/core-pack/src/modules/settings/definitions/settings-definitions.repository.ts`
- `packages/core-pack/src/modules/settings/auth/plugin-auth.service.ts`
- `packages/core-pack/src/modules/settings/auth/plugin-auth-key-provider.ts`
- `packages/core-pack/src/modules/security/security-provisioning.service.ts`

## Test e verifica

Copertura aggiornata con test dedicati per:

- reject setting ownership violation nel manifest;
- enforcement policy su value/secret writes;
- supporto key-rotation nel plugin auth.

Validation eseguita:

- `npm run typecheck --workspace @trinacria-cms/kernel`
- `npm run test --workspace @trinacria-cms/kernel`
- `npm run typecheck --workspace @trinacria-cms/core-pack`
- `npm run test --workspace @trinacria-cms/core-pack`

## Limiti noti (accettati in questa fase)

- metrica non persistita (solo processo corrente);
- nessun bus eventi distribuito in questa milestone;
- nessuna migrazione DB necessaria (fase unstable con schema evolvibile).

## Esito milestone

Milestone chiusa: il layer settings e ora piu sicuro, piu prevedibile e piu osservabile senza introdurre complessita non necessaria.
