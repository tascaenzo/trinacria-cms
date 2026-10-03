# 0007 - Come progettare un nuovo plugin in modo professionale

Modello aggiornato il 3 ottobre 2026: plugin fidati in-process, nessuna approvazione
DB per integrazioni locali, lifecycle single-instance e cluster opzionale.
Vedi il [contratto operativo corrente](../architecture/plugin-platform/trusted-plugin-model.md).

Questo capitolo descrive lo standard pratico per creare plugin compatibili con il kernel e con il provisioning del manifest del `core-pack`.

## 1. Decisione iniziale

Un dominio merita un plugin separato se:

- ha lifecycle indipendente
- puo essere caricato/scaricato senza fermare il CMS
- espone capability utili ad altri plugin

## 2. Scaffold raccomandato

Esempio: `packages/blog-pack`

Struttura minima:

- `src/plugin/`
- `src/modules/`
- `src/index.ts`
- `test/`

Pattern modulo:

- `schemas.ts`
- `dto/`
- `repository.ts`
- `service.ts`
- `controller.ts`
- `module.ts`

## 3. Identita e manifest

### 3.1 Costante plugin

Definisci una sola costante:

- `BLOG_PACK_PLUGIN_ID = "blog-pack"`

### 3.2 Manifest minimo

Campi base:

- `id`
- `version`
- `requiresCore`
- `capabilities`
- `dependencies`

### 3.3 Cataloghi security esportati dal core-pack

`core-pack` esporta cataloghi tipizzati per evitare stringhe duplicate:

- `CORE_PACK_CAPABILITY_LIST`
- `CORE_PACK_PERMISSION_KEYS`
- `CORE_PACK_PERMISSION_DEFINITIONS`

Esempio:

```ts
import { CORE_PACK_CAPABILITY_LIST, CORE_PACK_PERMISSION_KEYS } from "@trinacria-cms/core-pack";
```

## 4. Manifest security (nuovo standard)

Se il plugin aggiunge permessi o contribuisce ruoli, usa `manifest.security`:

- `permissions[]`
- `roles[]`
- `grants[]`
- `policyRules[]` (facoltativo, per `allow/deny` wildcard e condizioni)

Regole:

- permission key obbligatoria: `<pluginId>:<resource>:<action>`
- i grant devono usare permission key owned dal plugin
- `permissionPattern` in `policyRules`: `<pluginId>:<resource|*>:<action|*>`
- se usi security, dichiara dipendenza da `core-pack`

Esempio sintetico:

```ts
security: {
  permissions: [
    { key: "blog-pack:posts:read", displayName: "Read posts" },
    { key: "blog-pack:posts:publish", displayName: "Publish posts" }
  ],
  grants: [
    {
      roleCode: "editor",
      permissionKeys: [
        "blog-pack:posts:read",
        "blog-pack:posts:publish"
      ]
    }
  ],
  policyRules: [
    {
      roleCode: "editor",
      effect: "deny",
      permissionPattern: "blog-pack:posts:delete"
    },
    {
      roleCode: "editor",
      effect: "allow",
      permissionPattern: "blog-pack:posts:read",
      conditions: ["resource_id_required"]
    }
  ]
}
```

## 5. Traduzioni e namespace

Un plugin dichiara metadati i18n leggeri in `manifest.i18n`. Il namespace e
locale al plugin e identifica la superficie che lo usa (`admin`, `public` o
`mobile`). I dizionari reali restano negli asset del package, ad esempio
`src/i18n/public/en.json` e `src/i18n/public/it.json`.

Ogni namespace deve elencare il fallback inglese. Il manifest non contiene i
messaggi:

```ts
i18n: {
  fallbackLocale: "en",
  namespaces: [
    { id: "public", surface: "public", locales: ["en", "it"], source: "public" }
  ]
}
```

Esponi gli asset nella definizione del plugin: il provisioning importa un
record DB piccolo per ogni coppia lingua/chiave.

```ts
const plugin: KernelPluginDefinition = {
  manifest,
  i18nSources: [
    { source: "public", locale: "en", messages: en },
    { source: "public", locale: "it", messages: it }
  ]
};
```

Un client esterno richiede una sola superficie con
`GET /v1/i18n/:locale?namespace=blog-pack:public`.
Il Backoffice carica tutti i namespace admin installati con
`GET /v1/i18n/:locale?surface=admin`.

## 6. Root module

`BlogPackRootModule` deve fare composizione, non business logic.

## 7. Dominio interno

Repository:

- usa `DbAdapter` e `createPluginDbScope`

Service:

- contiene policy applicative

Controller:

- parse DTO input
- risposta con `createPluginApiResponder(pluginId)`
- route docs OpenAPI

## 8. Lifecycle runtime e provisioning

Con `startCmsApp(...)`:

- il plugin viene caricato dal runtime
- l'hook runtime `onAfterLoad` invoca `PluginManifestProvisioner.provision(...)`
- le risorse del manifest vengono sincronizzate nel Core: security
  (`permissions/roles` + grants embedded), settings e asset i18n locali al package
- incluse eventuali `policyRules` (`allow/deny`, wildcard, condizioni)

Su unregister:

- hook `onBeforeUnregister` invoca `deprovision(...)`; vengono rimossi anche i
  record di traduzione owned dal plugin

## 9. Checklist pre-rilascio

1. manifest valido (`validatePluginManifest`)
2. key permission namespaced corrette
3. dipendenza `core-pack` presente se usi `security`
4. typecheck/test verdi
5. smoke API su playground
6. endpoint presenti in OpenAPI

## 10. Anti-pattern da evitare

- usare permission key non namespaced
- modificare direttamente ruoli altrui senza grants
- saltare `dependencies` e contare sull'ordine manuale di load
- mettere logica business nei controller

## 11. Conclusione

Un plugin moderno in Trinacria CMS e contract-first: dichiara cosa offre (`capabilities`) e cosa contribuisce alla security (`manifest.security`), lasciando al runtime la sincronizzazione coerente.

## 11. Riferimento eseguibile: team onboarding

Il repository include un plugin completo e copiabile in
[`examples/team-onboarding-plugin`](../../../examples/team-onboarding-plugin).
Non e uno pseudo-codice: il package viene compilato, testato e puo essere
caricato dal playground come `workspace` source.

Per avviarlo da un checkout pulito, segui il **Quick start** nel suo
[README](../../../examples/team-onboarding-plugin/README.md): e la fonte unica
per dipendenze locali, compilazione e flag di attivazione del playground.

Il riferimento mostra, nello stesso manifest:

- `onLoad` e `onUnload` per il lifecycle;
- permission key e grant a ruoli esistenti;
- setting tipizzati e owner-scoped;
- subscription all'evento pubblico `core-pack:user-invited`;
- un contratto evento `audit` dichiarato dal plugin;
- widget e sezione Settings visibili nel backoffice senza duplicare la shell.

Per trasformarlo in un plugin di dominio reale, sostituisci prima package name e
plugin ID, poi aggiungi entity, repository, service, controller e relativo
contratto OpenAPI. Genera infine il client da `packages/sdk`: il backoffice deve
consumare l'SDK, non URL o fetch duplicati nel componente React.

Per il percorso operativo completo, inclusi onboarding, ruoli, settings,
operazioni plugin e audit lifecycle, segui
[0022 - Beta team onboarding](./0022-beta-team-onboarding.md).

## Autorizzazione degli eventi

Le sottoscrizioni protected/audit richiedono permesso dichiarato dall'owner e decisione
positiva della policy. Authorizer assente fallisce il load; Core fornisce il provider DI.
Host minimali devono fornire un authorizer esplicito ristretto. La policy viene verificata
a ogni consegna usando manifest e dipendenze locali, senza grant DB da approvare.
La disattivazione blocca nuove attività e attende il lavoro tracciato già in corso.
Unload/reload invalida le generazioni precedenti; un binding parziale viene ripulito con
rollback moduli, anche per dipendenze ricorsive. Diagnostica redatta disponibile tramite
onDeliveryDiagnostic del runtime o onPluginEventDeliveryDiagnostic dello starter.
I plugin in-process restano fidati: A1 non introduce una sandbox.

## Servizi host del plugin (A0 implementato)

Hook lifecycle e handler eventi ricevono `context.services`; `context.app` e il container/bus
senza restrizioni non fanno più parte del contratto plugin. Usare i tipi pubblici
`PluginHostServices`, `PluginStorage`, `PluginRepository`, `PluginQuery` da
`@trinacria-cms/kernel/plugin-api` e gli helper manifest esistenti.

```ts
async function onLoad(context: { services: PluginHostServices }) {
  const items = await context.services.storage.repository("items").findMany({ limit: 20 });
  await context.services.logger.info("Plugin inizializzato", { action: "initialize" });
}
```

Dichiarare `items` nel manifest e registrarne lo schema nel modulo con
`defineEntity({ ownerPluginId: "your-plugin", entityName: "items", schema })` da
`@trinacria-cms/kernel/runtime`. Storage fissa l'owner; findMany ha default/massimo 100,
rifiuta metadata del driver. `storage.transaction(work)` mantiene owner/sessione, rifiuta
annidamenti e invalida i repository alla fine del tentativo. I servizi conservati scadono
con unload/reload. Settings get/set ammette soltanto chiavi proprie dichiarate; secrets e
chiavi altrui sono negati. Il publisher è `services.events.emit`. Il logger fissa l'owner
e limita i metadata; usare messaggi fissi senza dati sensibili.

Per servizi applicativi composti dall'host usare `pluginOperationsProvider` da `@trinacria-cms/kernel/runtime`:
le dipendenze DI esplicite sono risolte nella composizione del modulo, che deve esportare
il token del provider. Chiamare `services.operations.call(ownerPluginId, name, jsonInput)`;
input validato da schema, input/output JSON copiati (1 MiB, profondità 32). Private è solo
owner. Ogni chiamata cross-plugin richiede permesso dichiarato dall'owner e dipendenza
nel manifest. La policy standard Core verifica questi contratti in memoria, senza
approvazioni DB né fence sui grant. Assenza della policy nega. `{ signal }` abilita cancellation
cooperativa. I pack ufficiali usano operazioni private nominate per inizializzazione,
cleanup e consegna email, senza restituire istanze di servizi o secrets raw ai chiamanti.

La discovery importa soltanto file configurati sotto root realpath autorizzate. Default:
`process.cwd()`; l'host configura `pluginAllowedRoots` nelle opzioni di `startCmsApp` per
root package/workspace aggiuntive. URL HTTP/data/node, query/fragment e symlink fuori root
sono rifiutati prima dell'import. Package fidati fissati nel lockfile e revisionati:
questo confine API non isola il codice in-process.

Mongo usa `v2_` più SHA-256 di `[pluginId, workspaceId ?? null, entityName]`, con registro
ownership persistente e indici unique tuple/nome fisico. Collezioni `plugin_`/`kernel__`
precedenti bloccano l'inizializzazione: scegliere un DB di sviluppo vuoto oppure pianificare
una migrazione esplicita. Nessun reset automatico o fallback legacy. `HostUnitOfWork` è
infrastruttura avanzata dell'host e non è esposto da servizi/plugin-api.

## Payload sensibili (A2 implementato)

Usare `context.services.securePayloads`, di tipo pubblico `SecureEventPayloadClient`,
per create/claim/revoke. Producer/consumer sono fissati dal runtime; non passarli nel body.
Claim richiede eventName, payloadType, schemaVersion e requiredPermission corrispondenti.
Record restituiti e policy non contengono ciphertext; solo un claim CAS riuscito restituisce
plaintext. Scadenza/stato/limiti/destinatario negano prima della policy; policy assente,
errata o negativa nega. Allowlist vuota nega tutti. Massimo tre tentativi, policy rivalutata.

```ts
const result = await context.services.securePayloads.claim<{ message: string }>({
  payloadId: notification.securePayloadId,
  eventName: context.eventName,
  payloadType: "producer:message",
  schemaVersion: 1,
  requiredPermission: "producer:payload:read"
});
```

Lo starter richiede keyring esplicito anche in sviluppo: `CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID`
e `CMS_SECURE_PAYLOAD_KEYS_JSON` (chiavi base64 di 32 byte casuali). Nessun fallback.
Retention terminale default 24 ore con TTL, separata dall’autorizzazione della scadenza.
Configurazione, errori e rotazione CAS riprendibile sono nel [runbook A2](../architecture/plugin-platform/secure-payload-keyring-runbook.md).

## Operazioni applicative (A3)

Usare `context.services.operations.call(owner, name, input)` per un'operazione business
registrata. Il runtime crea il contesto plugin certificato: non inviare actor, userId
oppure un OperationContext nel payload. Le integrazioni fidate sono autorizzate dalla configurazione; pubblicare
una entry verifica anche azione del workflow e publish. I settings propri dichiarati e non segreti usano la capability scoped, senza grant
API verso se stessi. Operazioni Settings cross-plugin richiedono dipendenza e permesso
dichiarati; i client HTTP firmati conservano grant espliciti separati.
Le integrazioni host usano facade con il contesto come primo argomento; una delega
richiede un contesto utente già autenticato e verifica entrambi i principal.
Il codice in-process resta fidato. Vedi il [modello standard](../architecture/plugin-platform/trusted-plugin-model.md).

## Export pubblici dopo B0

Helper di authoring da kernel/plugin-api, tipi da kernel/contracts e firma Settings
da core-pack/plugin-api. La composizione host usa il subpath experimental `/runtime`
di kernel e pack; repository e servizi raw sono assenti dalle root dei pack.
Vedi la [baseline degli otto package](../specs/core-platform/public-api/README.md).
Semver segue i range npm rigorosi: ^0.1.0 esclude 0.2.0 e prerelease richiedono ammissione esplicita.

## SDK overlay (B1)

```sh
trinacria-sdk ./openapi.json ./generated/catalog --mode overlay --owner catalog-plugin
```

Import `createPluginSdk` from the generated index and call it with the existing CMS
client. The overlay uses `@trinacria-cms/sdk/runtime` and leaves official groups intact.
The output directory must be dedicated; generated files are tracked by its ownership
marker. Unsupported schemas and sanitized operation/tag collisions stop generation.
See `packages/sdk/README.md` for HTTP authentication and binary transports.

## Starter catalogo esterno (D0)

```sh
create-trinacria-plugin ./catalog-plugin catalog-plugin
cd catalog-plugin
npm install
npm run build
npm test
trinacria-sdk ./openapi.json ./generated/catalog --mode overlay --owner catalog-plugin
```

Registrare il backend esplicitamente dopo Core. Importare `/admin-manifest` per i
metadata puri e `/admin` per i renderer React; ricompilare l'host admin fidato. La pagina
supporta CRUD, paginazione limitata, conflitti di versione e recupero da errore API.
Il backend non richiede React. Il README generato e il
[runbook sviluppatore esterno](../architecture/plugin-platform/external-plugin-runbook.md)
spiegano contratti di integrazione, eventi durevoli, lifecycle e prova umana indipendente.
