# B0 — Export pubblici, semver e politica di compatibilità

## Obiettivo

Consegnare il blocco B0 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`kernel | sdk | docs | infra`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: completato e verificato il 2 ottobre 2026.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[Export pubblici, semver e politica di compatibilità](../../../docs/cms/architecture/plugin-platform/api-sdk-and-release.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

Nessuna baseline pubblicata; includere contratti A0/A3 prima del freeze della prima release.

## Scope e incrementi

- [x] Sostituire semver locale con dipendenza diretta semver e conservare wrapper pubblici.
- [x] Inventariare export pubblici/experimental/interni e preparare snapshot d.ts più fixture consumer.
- [x] Implementare revisione delle diff di contratto e controlli core/plugin/admin, incluse prerelease.
- [x] Allineare guide EN/IT e contratti storici alle implementazioni effettive.
- [x] Aggiornare direttamente export e route con tutti i consumer; nessuna deprecazione o dual API.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

kernel/runtime/plugin-manifest/semver.ts, package manifests, scripts/ci, docs e fixture TypeScript.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

Caret 0.x/OR/prerelease, plugin incompatibili rifiutati, snapshot e consumer TypeScript del contratto target; nessun affidamento a semver transitivo.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.

## Consegna e verifiche

Semver è dipendenza diretta kernel con tipi di sviluppo. Wrapper rigorosi npm, test
caret 0.x/build/prerelease/OR e runtime negativo su minor/prerelease/dipendenze.
Root dei pack e kernel separata dalle implementazioni host `/runtime`; 71 file di
consumer aggiornati, esempi e guide allineati. Nessun alias legacy.

[Baseline degli otto package](../../../docs/cms/specs/core-platform/public-api/README.md):
inventario completo per simbolo/subpath/stato, snapshot delle dichiarazioni raggiungibili,
fixture TypeScript positiva/negativa e verifica manifest/range Core/plugin/peer admin.
Check integrato in npm run check e CI; revisionare la diff e aggiornare snapshot insieme
al changelog. Versione della prima pubblicazione da fissare al gate G2.

Node 24.21.0/npm 11.16.0, senza cache Turbo: npm run check passato (563 passati,
13 skip opt-in); build 12/12; public-api:check passato. Test import repository aggiornati
a `/runtime` dopo un primo fallimento mirato. Nessuna modifica di comportamento HTTP
o UI: Chromium/Storybook non ripetuti in B0; saranno eseguiti per B1. Log locali:
/private/tmp/trinacria-b0-check.log, /private/tmp/trinacria-b0-build.log.
