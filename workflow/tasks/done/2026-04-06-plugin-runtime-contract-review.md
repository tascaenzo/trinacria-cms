# Review contrattuale del runtime plugin

## Obiettivo

Verificare che i contratti runtime plugin siano sufficienti per supportare gestione operativa, diagnosi e amministrazione dal CMS.

## Scope

- In scope: stati runtime
- In scope: eventi e failure modes
- In scope: metadati discovery necessari al backoffice
- Out of scope: implementazione della UI admin

## File o aree impattate

- `packages/kernel/src/contracts/**`
- `packages/kernel/src/runtime/**`
- `docs/cms/**`

## Check da eseguire

- review manuale runtime/list snapshots
- aggiornamento docs se cambiano i contratti
