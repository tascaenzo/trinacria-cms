# Admin manifest documentation and refactor review

## Obiettivo

Documentare l'architettura admin manifest/declarative appena introdotta e
riallineare le carte esistenti dopo il refactor dei contratti e dei renderer.

## Area

`docs | backoffice`

## Milestone

`M5+ - Admin extensibility hardening`

## Scope

- In scope: aggiornare specifica admin extensibility core.
- In scope: aggiungere manuale IT/EN su manifest admin e backoffice declarative.
- In scope: aggiornare README `admin-kernel` con pipeline, struttura file e security policy.
- In scope: registrare la review dei vecchi file documentali correlati.
- Out of scope: implementare endpoint backend `GET /admin/extensions`.
- Out of scope: documentazione completa per plugin dominio specifici.

## File impattati

- `docs/cms/specs/core-platform/admin-contribution-resource.md`
- `docs/cms/it/0019-admin-manifest-e-backoffice-declarative.md`
- `docs/cms/en/0018-admin-manifest-and-declarative-backoffice.md`
- `docs/cms/it/README.md`
- `docs/cms/en/README.md`
- `packages/admin-kernel/README.md`
- `docs/cms/GLOSSARY.md`
- `docs/cms/specs/core-platform/README.md`
- `docs/cms/specs/core-platform/plugin-contract.md`
- `docs/cms/specs/core-platform/public-plugin-api.md`
- `workflow/tasks/done/2026-06-06-admin-manifest-documentation-and-refactor-review.md`

## Review eseguita

- Verificata documentazione esistente in `docs/cms/specs/core-platform`.
- Aggiornata la vecchia specifica `admin-contribution-resource.md`, che parlava ancora di contribution generiche e discovery endpoint target non allineato.
- Verificati README package coinvolti, in particolare `packages/admin-kernel/README.md`.
- Verificati indici manuale IT/EN per inserire i nuovi capitoli.
- Verificati glossario e indice specifiche core platform.
- Riallineati i riferimenti admin declaration in `plugin-contract.md` e `public-plugin-api.md`.
- Mantenuto separato `/v1/system/plugin-contributions` come diagnostica read-only, senza promuoverlo a sorgente UI eseguibile.

## Decisioni documentate

- `manifest` e il canale primario per plugin admin runtime.
- `contributions` resta escape hatch React locale/non serializzabile.
- Manifest raw e safe manifest sono concetti distinti.
- Sanitizzazione e normalizzazione sono responsabilita separate.
- Il renderer declarative deve restare senza logica business plugin.
- La policy endpoint frontend non sostituisce authorization backend.

## Check

- `npm run typecheck -w @trinacria-cms/admin-kernel`
- `npm run test -w @trinacria-cms/admin-kernel`
- `npm run build -w @trinacria-cms/backoffice`
