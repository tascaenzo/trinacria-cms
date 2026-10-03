# Analisi completa e decisioni tecniche della piattaforma plugin

## Obiettivo

Completare gli approfondimenti dei 12 punti della checklist e consegnare al team
specifiche esecutive, decisioni e task pronti per lo sviluppo.

## Area

`docs`

## Milestone

Preparazione documentale M8; task runtime M8 tutti ancora da implementare.

## Scope

- In scope: analisi del codice e delle dipendenze locali, contratti target, compatibilità,
  concorrenza, migrazioni, recovery, default operativi, test, gate e dipendenze dei task.
- Out of scope: modifica del runtime, pubblicazione pacchetti, deployment e prove di exploit.

## File impattati

- `docs/cms/architecture/plugin-platform-implementation-plan.md`
- Sei specifiche in `docs/cms/architecture/plugin-platform/`
- Checklist operativa, indici CMS/core-platform/workflow e changelog
- `workflow/milestones/M8-public-plugin-platform.md`
- 13 task in `workflow/tasks/todo/`, incluso A1 aggiornato alle decisioni completate

## Analisi ed esiti

Verificati contesti/loader/runtime, transaction scope e Mongo adapter, vault/crypto,
AuthZ, controller Editorial/Media, signing e nonce, grant settings, SDK/generatore/export,
packaging e dipendenza locale `@trinacria/events@0.1.1`.

Dettagli aggiuntivi incorporati: semver caret 0.x troppo permissivo, nonce consumato
prima della firma, assenza di query nella firma v1, keyVersion non selettivo nella
crypto, namespace fisici sanitizzati con possibili collisioni, transazioni pubbliche
mono-namespace e dedup bus distinta dal completamento dei consumer.

Registro di 20 decisioni nel piano: beta fidata, contesto scoped, deny-by-default,
revoca/generation, CAS vault, identity/operation contracts, semver standard, API/overlay,
packaging, migrazioni maintenance, outbox/inbox/job, nonce/grant/desired state, audit,
snapshot sito/preview, keyring, ownership e unit of work host.

## Check

- Validazione dei link locali di documenti, milestone e task.
- Mappatura dei 12 punti verso sei specifiche e 13 schede implementative.
- Confronto dell'inventario delle 22 operazioni Editorial con le route nel codice.
- Verifica locale della differenza del parser caret e delle collisioni di sanitizzazione.
- `git diff --check`.

Non sono state rieseguite le suite runtime per modifiche soltanto documentali. Gli
esiti 470 test/11 integrazioni/17 Chromium restano quelli della revisione baseline precedente.
Le prove concorrenti, recovery, isolamento e nuove API sono requisiti delle future PR,
non risultati ottenuti durante questa stesura.
