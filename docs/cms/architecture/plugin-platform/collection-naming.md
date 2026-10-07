# Nomi leggibili delle collection Mongo

Le collection usano il nome dell'entità seguito dal plugin proprietario:

```text
<entityName>__plugin_<pluginId>
<entityName>__plugin_<pluginId>__workspace_<workspaceId>
```

| Collection | Contenuto |
| --- | --- |
| `users__plugin_core-pack` | Utenti |
| `roles__plugin_core-pack` | Ruoli e permessi assegnati |
| `settings__plugin_core-pack` | Impostazioni, stato installazione e segreti cifrati |
| `entries__plugin_editorial-pack` | Contenuti editoriali |
| `content_types__plugin_editorial-pack` | Modelli dei contenuti |
| `entry_revisions__plugin_editorial-pack` | Revisioni editoriali |
| `publication_snapshots__plugin_editorial-pack` | Copie pubblicate |
| `assets__plugin_media-pack` | Metadati dei file media |
| `email_templates__plugin_email-pack` | Template email |
| `installed_plugins__plugin_kernel` | Stato runtime dei plugin |
| `storage_ownership__plugin_kernel` | Registro di proprietà delle collection |
| `assets__plugin_media-pack__workspace_team-1` | Media del workspace team-1 |

I plugin continuano a richiedere repository con il nome logico, ad esempio
`context.services.storage.repository("entries")`. Il kernel aggiunge il proprietario:
il plugin non sceglie il nome fisico o un altro owner. `buildPhysicalCollectionName`
è l'helper dell'host che genera lo stesso nome usato dall'adapter.

## Escaping senza collisioni

Lettere ASCII, cifre, trattini e underscore singoli restano leggibili. Non convertiamo
trattini, punti o slash in underscore: `a-b` e `a_b` devono restare distinti.
I componenti usano percent-encoding reversibile per caratteri riservati, Unicode,
punti, slash e percentuali. Gli underscore doppi vengono codificati come `%5F%5F`
per non confonderli con i separatori inseriti dal kernel.

Esempi:

- Plugin `vendor/plugin`: `items__plugin_vendor%2Fplugin`.
- Workspace `team:a`: `items__plugin_catalog__workspace_team%3Aa`.
- Entità `item_s`: `item_s__plugin_catalog`.
- Entità `item__s`: `item%5F%5Fs__plugin_catalog`.

Il registro ownership conserva anche `pluginId`, `workspaceId`, `entityName` e la
tuple JSON canonica. Gli indici unici su tuple e nome fisico e i controlli dell'entity
registry restano attivi. La leggibilità dei nomi non modifica autorizzazione o scoping.

## Database di sviluppo esistente

Il progetto è in beta: il runtime adotta direttamente il nuovo naming, senza mantenere
un secondo adapter o un fallback automatico. I vecchi layout vengono rifiutati prima
dell'inizializzazione dello storage per evitare di mostrare un CMS apparentemente vuoto.

Il database mock locale è stato rinominato esplicitamente dal registro ownership,
con CMS fermo, backup, controllo di collisioni, aggiornamento dei mapping e verifica
di documenti e indici. Non sono cambiati ID, password o riferimenti dei contenuti.
Le nuove installazioni e `npm run db:mock:reset` creano direttamente nomi leggibili.
