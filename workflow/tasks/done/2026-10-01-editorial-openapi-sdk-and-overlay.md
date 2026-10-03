# B1 — OpenAPI Editorial, SDK tipizzato e overlay esterno

## Obiettivo

Consegnare il blocco B1 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`editorial-pack | sdk | kernel | backoffice`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: completato il 2 ottobre 2026.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[OpenAPI Editorial, SDK tipizzato e overlay esterno](../../../docs/cms/architecture/plugin-platform/api-sdk-and-release.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

A3 per semantica finale authz/errori; B0 per stabilità dei contratti.

## Scope e incrementi

- [x] Documentare le 22 route Editorial con operation ID fissati, DTO/query/errori e auth bearer/cookie.
- [x] Confrontare route bootstrap e OpenAPI, vietare ID/tag collidenti dopo sanitizzazione.
- [x] Rigenerare snapshot/SDK e migrare admin Editorial da cms.request.
- [x] Distribuire CLI generate con modalità overlay, export sdk/runtime e output safe.
- [x] Testare schemi dinamici/union/ref e roundtrip HTTP; schema non supportato genera errore esplicito.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

Editorial controllers/schema response, kernel/cms-starter/openapi, sdk scripts/runtime/generated/catalog, admin Editorial.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

SDK check, inventory route/OpenAPI, 22 operazioni tipizzate, overlay in repository senza workspace, collisioni e cleanup output sicuro.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.

## Risultati verificati

- 22 operation ID Editorial, schemi condivisi, JSON annidato/null, paginazione limit ≤100 e sort stabile; conflitti tipizzati 409.
- Bootstrap reale: 125 route inventariate, 113 operazioni pubbliche; esclusioni motivate, cookie effettivo e firma plugin a quattro header.
- SDK ufficiale/overlay, runtime pubblico, CLI deterministica con marker di ownership e protezioni sui path; Media binario Uint8Array senza alterazione dei byte.
- Admin Editorial usa solo metodi SDK tipizzati. Snapshot acquisito senza patch locali.
- `npm run check`: 569 pass, 13 skip opt-in, nessun fallimento. Build 12/12; SDK test 7/7 e SDK check pass.
- Integrazioni Mongo: 20 pass, 2 skip S3 opt-in; Storybook 11 task pass. Chromium 19/19 pass.
- Verifica esterna overlay TypeScript senza workspace e casi negativi collisioni/ref/schema/output.
