# B2 — Packaging distribuito e host esterno backend/admin

## Obiettivo

Consegnare il blocco B2 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`kernel | core-pack | sdk | admin-kernel | infra`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: completato il 2 ottobre 2026; nessuna pubblicazione effettuata.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[Packaging distribuito e host esterno backend/admin](../../../docs/cms/architecture/plugin-platform/api-sdk-and-release.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

A0, B0, B1; fixture infrastrutturale può precedere pubblicazione.

## Scope e incrementi

- [x] Preparare files/export/license e peer dei pacchetti distribuibili, mantenere app root private.
- [x] Build/pack topologico e registry locale temporaneo per risolvere dipendenze ufficiali.
- [x] Installare fixture esterna senza symlink/workspace, avviare backend senza React.
- [x] Integrare renderer fidati via subpath e build admin con una sola copia React.
- [x] Preparare release coordinata/provenienza/checksum; non pubblicare durante sviluppo della fixture.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

Manifest di otto pacchetti pubblici, scripts release/fixtures e docs installazione.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

Tarball contenuti completi/assenza env, import/export/type declarations, npm install indipendente, browser/headless e boundaries.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.

## Evidenze

Otto pacchetti con MIT, LICENSE/README, allowlist files, export e CLI nei tarball.
Root/app/esempi privati; peer frontend opzionali dei pack e richiesti dal progetto admin.
`npm run release:test` passato con Node 24.21.0/npm 11.16.0: registry localhost,
installazioni fuori dal checkout, backend senza React, quattro plugin loaded e 22 route
Editorial, fixture TypeScript, admin Vite e Chromium con una copia fisica React.
Pipeline CI e manifest checksum/provenance predisposti. La versione interna 0.1.0 resta
provvisoria per i test; prima beta coordinata e pubblicazione sono gate G2, non eseguiti.
Script e procedura in `scripts/release/README.md`; fixture/database temporanei isolati.
