# Review contrattuale del runtime plugin

## Meta

- ID: `task-plugin-runtime-contract-review`
- Stato: `todo`
- Area: `kernel`
- Milestone: `M3`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Verificare che i contratti runtime plugin siano sufficienti per supportare gestione operativa, diagnosi e amministrazione dal CMS.

## Contesto

Il runtime plugin esiste gia, ma la sua forma attuale nasce soprattutto come infrastruttura interna. Serve una review orientata alle operazioni.

## Scope

- In scope: stati runtime
- In scope: eventi e failure modes
- In scope: metadati discovery necessari al backoffice
- Out of scope: implementazione della UI admin

## Deliverable

- gap list contrattuale
- decisione sulle informazioni minime da esporre
- eventuali task derivati di implementazione

## File o aree impattate

- `packages/kernel/src/contracts/**`
- `packages/kernel/src/runtime/**`
- `docs/cms/**`

## Dipendenze

- baseline `M1` chiusa

## Check da eseguire

- review manuale runtime/list snapshots
- aggiornamento docs se cambiano i contratti

## Note operative

Verificare se mancano campi come:

- motivo ultimo failure
- enabled/disabled reason
- origine del plugin
- operazioni consentite sul plugin

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:
