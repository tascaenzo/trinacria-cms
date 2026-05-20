# Modello stati editoriali

## Meta

- ID: `task-editorial-state-model`
- Stato: `todo`
- Area: `docs`
- Milestone: `M5`
- Owner: `enzo`
- Creato il: `2026-04-06`
- Ultimo aggiornamento: `2026-04-06`

## Obiettivo

Definire il modello iniziale degli stati editoriali e delle transizioni consentite per le entries.

## Contesto

Il dominio contenuti diventa davvero utile quando supporta almeno bozza e pubblicazione con regole chiare.

## Scope

- In scope: stati iniziali
- In scope: transizioni consentite
- In scope: permessi editoriali minimi
- Out of scope: approvazioni multi-step

## Deliverable

- state machine editoriale
- regole autorizzative minime
- doc di riferimento

## File o aree impattate

- `docs/**`
- moduli contenuti da aggiornare successivamente

## Dipendenze

- milestone contenuti `M4`

## Check da eseguire

- review architetturale

## Note operative

Stati minimi candidati:

- draft
- published
- archived

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:
