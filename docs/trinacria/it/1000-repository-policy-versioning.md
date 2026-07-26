# Repository: Policy di Versioning

Questo documento descrive la policy di versioning prevista per i package pubblicabili. Changesets e la pubblicazione automatica non sono attualmente configurati nel root di questo CMS.

## Strategia

- Modalità versioning: indipendente (ogni package può avanzare in modo autonomo)
- Convenzione versioni: SemVer (`MAJOR.MINOR.PATCH`)
- Branch base: `main`
- Workspace non pubblicati: `playground`, `api-prisma-postgresql`, `api-mongoose-mongodb`, `api-events-redis`, `api-events-rabbitmq`

## Flusso proposto per modifiche ai package

1. Implementa le modifiche.
2. Registra l'impatto di versione previsto finche` non viene introdotto uno strumento di release.

3. Seleziona package coinvolti e tipo di bump:

- `patch`: fix e miglioramenti interni backward-compatible
- `minor`: nuove feature backward-compatible
- `major`: breaking changes

4. Committa codice e nota di release nella stessa PR.

## Futuro flusso release su `main`

Quando verra` aggiunto un workflow di release, dovra` creare una release PR revisionabile, pubblicare da `main` e creare i tag dei package.

## Note

- Non eseguire comandi `changeset` o di release non documentati: non sono definiti nell'attuale `package.json` root.
- Le note changelog devono essere sintetiche e orientate all'utente.
- Per breaking changes, includi note di migrazione nel body del changeset.

## Documenti correlati

- [`1001 - Repository: comandi e workflow CI`](./1001-repository-release-scripts-workflow.md)
- [`1003 - Repository: Workflow Branching`](./1003-repository-branching-workflow.md)
- [`1005 - Repository: Flussi reali attivi`](./1005-repository-real-workflows.md)
