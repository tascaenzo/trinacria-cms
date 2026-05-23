# Milestones

Le milestone raggruppano task correlati in una fase di sviluppo.

Le milestone nuove devono rispettare la direzione
[plugin-first CMS](../../docs/cms/architecture/plugin-first-cms-direction.md): il core resta
infrastrutturale, mentre i domini applicativi vivono in plugin.

## Regole

- una milestone ha un file dedicato
- ogni task deve riferirsi a una milestone
- la milestone contiene obiettivo, task inclusi, dipendenze e criterio di chiusura

## Milestone attiva

- `M4 - Core Platform Foundation`: milestone ombrello per rendere reale la
  piattaforma core plugin-first prima di implementare domini.

Fasi interne:

- `M4.0-plugin-first-specifications.md`: specifiche low-level e contratti
  fondativi, completata.
- Prossimo blocco M4: runtime plugin reale con discovery/loading,
  compatibilita, failure mode e persistenza Mongo.

Nota: le vecchie milestone dominio `M4-content-model-v1.md` e
`M5-editorial-workflow-v1.md` restano deferred finche M4 core platform non e
chiusa. Il numero M4 ora identifica la fondazione core, non il primo dominio
editoriale.

## Nome file consigliato

`M<n>-<slug>.md`

Esempio:

`M1-allineamento-contratti-admin-api.md`
