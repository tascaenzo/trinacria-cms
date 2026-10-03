# Revisione della baseline e checklist piattaforma plugin

## Obiettivo

Rivalutare il checkout dopo il merge PR #16 e preparare una checklist operativa per
la futura implementazione della piattaforma plugin pubblica.

## Area

`docs`

## Milestone

Follow-up documentale del consolidamento M7; nessuna nuova milestone runtime avviata.

## Scope

- In scope: revisione del codice a `fc33de9`, verifiche della baseline, priorità,
  evidenze, criteri di completamento e sequenza delle prime PR.
- Out of scope: implementazione dei punti della checklist, pubblicazione dei pacchetti,
  deployment e certificazione di sicurezza.

## File impattati

- `docs/cms/architecture/plugin-platform-operational-checklist.md`
- `docs/cms/README.md`
- `workflow/README.md`
- `workflow/changelog/CHANGELOG.md`

## Check

- Node 24.21.0 e npm 11.16.0; runtime temporaneo esistente, nessuna modifica globale.
- `npm run check` con `TURBO_FORCE=true`: 470 test passati, 0 falliti;
  5 integrazioni saltate nella suite ordinaria e verificate separatamente.
- `turbo run build storybook:build --force`: 13 task passati; warning chunk Storybook.
- `npm run sdk:check`: passa.
- Integrazioni: 9 Mongo e 2 S3/Redis passate in due lanci con servizi dedicati.
- `npm run e2e`: 17/17 Chromium passati; database isolati e guardrail di reset attivi.
- `git diff --check`: passa.

## Risultato

Baseline valida nei controlli eseguiti. Confermati i gap di fiducia in-process,
autorizzazione degli eventi, claim concorrenti, autorizzazione applicativa, SDK Editorial,
packaging e sicurezza tra repliche. Separazione server/admin già protetta dal guardrail.
La checklist contiene 12 punti e una sequenza di implementazioni verificabili.

Le osservazioni di sicurezza derivano dalla lettura del codice: non sono state aggiunte
prove di exploit né correzioni al runtime. I test delle gare e dei bypass restano criteri
di accettazione delle future PR. CI remota e audit npm non ricontrollati in questo task.
