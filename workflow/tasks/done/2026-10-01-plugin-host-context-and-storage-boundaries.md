# A0 — Contesto plugin, ownership e transazioni host

## Obiettivo

Consegnare il blocco A0 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`kernel | core-pack | editorial-pack | media-pack | email-pack | playground | docs`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: completato e verificato il 1 ottobre 2026.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[Contesto plugin, ownership e transazioni host](../../../docs/cms/architecture/plugin-platform/security-and-operations.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

Nessuna dipendenza esterna: A0 inizializza registry e indici prima dello storage;
C0 riusa la primitiva nel runner di migrazioni future.

## Scope e incrementi

- [x] Sostituire app con PluginHostServices nei contesti e aggiornare pack ufficiali/starter.
- [x] Vincolare storage/settings/events al plugin autenticato; controllare root realpath della discovery.
- [x] Aggiungere ownership entità e naming target senza collisioni; recupero storage precedente opzionale.
- [x] Implementare HostUnitOfWork interno con allowlist host e sessione condivisa; conservare DbAdapter pubblico scoped.
- [x] Attivare mapping storage_ownership e naming v2 direttamente, con bootstrap indici nell'adapter.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

kernel/src/contracts, runtime/plugin-discovery, runtime/persistence, runtime/plugin-runtime; integrazioni Core e pack ufficiali.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

Test owner/namespace/symlink, rollback dominio+kernel, namespace fuori allowlist, cold start senza React e compilazione di tutti gli esempi aggiornati.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.


## Risultato consegnato

- Contesti lifecycle/handler con soli servizi scoped, senza app/bus/resolver diretto;
  publisher e repository di generazioni precedenti non riutilizzabili.
- Storage vincolato alle entità proprie dichiarate, query massimo 100 record e senza
  metadata del driver; settings propri dichiarati, generic secrets get/set negato.
- Operazioni nominate registrate da moduli host con schema/DI espliciti, JSON copiato,
  private owner-only, cross-owner con permesso dichiarato e policy rigorosamente positiva.
  Policy assente/errore/decisione invalida nega; cambio generazione durante policy impedisce
  invocazione. Policy applicativa Core/grant completa resta A3/C2.
- Logger con owner host, metadata allowlist e redazione di URL/email/chiavi sensibili note;
  i plugin devono usare messaggi fissi, la redazione non riconosce secrets arbitrari.
- Discovery file locale, realpath e root host (`pluginAllowedRoots` nello starter),
  senza URL remoti/fragment/query o symlink fuori root prima dell'import.
- Entità con owner obbligatorio; nomi hash canonici e registry Mongo persistente con due
  indici unici, verificati prima di storage e dopo riconnessione. Vecchio layout rilevato
  e bloccato esplicitamente senza alterare dati; nessun recupero/reset automatico.
- HostUnitOfWork con allowlist, sessione condivisa, commit/rollback atomico, divieto
  nesting e invalidazione repository a fine tentativo, anche nei retry driver.
  Non esportato da plugin-api/services; infrastruttura avanzata riservata all'host.
- Editorial/Media/Email usano operazioni private initialize/shutdown/deliver invece di
  risolvere servizi nel contesto. Timer Media per istanza provider e cleanup su unload;
  email fissa consumer email-pack e non restituisce plaintext all'handler.
- Helper composizione in kernel/runtime; plugin-api mantiene runtime browser-safe.
  Aggiunto guardrail al confine e vincolo Turbo typecheck SDK → generate, verificato
  il difetto di concorrenza nella generazione.

## Verifica finale

Node 24.21.0 da `.nvmrc`, npm 11.16.0, nessun commit/PR creato.

- `TURBO_FORCE=true npm run check`: format/lint/guardrail/typecheck/boundary/dependencies
  passati; 512 test passati, 0 falliti, 7 opt-in skip.
- `TURBO_FORCE=true npm run e2e`: build completa senza cache (12 task) e 17/17 Chromium.
- `TRINACRIA_RUN_MONGO_INTEGRATION=1 TURBO_FORCE=true npm run test:integration`:
  11 scenari Mongo passati, 0 falliti; 2 skip Redis/S3 non configurati in questo lancio.
  Include collisioni owner/workspace, owner errato, allowlist/nesting/escape e rollback
  dominio+kernel, vecchio layout con marker preservato.
- `npm run sdk:check`: generato allineato allo snapshot.
- Import cold di kernel/plugin-api e quattro pack con hook Node che rifiuta React/ReactDOM:
  nessuna dipendenza frontend caricata. Guardrail statico anche sul plugin-api condiviso.
- Link locali, fence Markdown e `git diff --check` verificati. Nessuna UI modificata,
  quindi Storybook non ripetuto.

Log locali temporanei: `/private/tmp/trinacria-a0-{check,e2e,integration,sdk,headless}.log`.
Usati soltanto DB dedicati ai test; Mongo preesistente lasciato attivo, sviluppo non resettato.
La CI remota non è stata verificata.

## Decisioni e seguito

A0 inizializza da subito registry/indici ownership nell'adapter: evita dipendere dal runner
C0 ancora da implementare per usare il layout target. C0 riuserà la stessa primitiva per
upgrade futuri; il recupero di dati di sviluppo resta un percorso separato e opzionale.
Non introdotti alias di compatibilità. Questo confine API non è una sandbox in-process.
Prossimo task: A2 per CAS vault, divieti strutturali e keyring; poi A3 per policy applicative.
