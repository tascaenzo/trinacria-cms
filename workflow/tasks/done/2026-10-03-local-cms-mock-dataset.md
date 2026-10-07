# Database locale CMS ricreato con dati mock

Richiesta: eliminare i database residui del progetto e mantenere un solo database CMS
di sviluppo, ricreato da zero con dati dimostrativi validi.

## Risultato

- Backup del precedente `trinacria_cms` salvato localmente sotto `.tmp/db-backups/`.
- Database CMS ricreato con le collezioni e gli indici correnti, senza collezioni legacy.
- Eliminati 29 database residui con prefisso `trinacria_` dopo le verifiche del dataset.
- Restano solo `trinacria_cms` e i tre database interni Mongo: `admin`, `config`, `local`.
- Quattro utenti, tre modelli, tredici contenuti: dieci pubblicati, due bozze, uno in revisione.
- Tre PNG pubblici e quattro voci di navigazione. Note interne escluse dalla delivery.
- Installer, permessi, traduzioni, impostazioni e template email inizializzati dai plugin.
- Credenziali amministratore casuali conservate nel file locale ignorato `.tmp/mock-cms/access.json`.

## Implementazione e verifica

Lo [script di reset](../../../scripts/dev/reset-mock-db.mjs) usa installer e SDK reali,
non inserimenti diretti nei documenti applicativi. Il [runbook locale](../../../scripts/dev/README.md)
descrive backup, piano e reset. Il reset accetta solo Mongo locale e il database
`trinacria_cms`, rifiuta la produzione e conserva i database di altri progetti.

Il riavvio ha rilevato che il provider locale Media usava il percorso predefinito anche
con un percorso diverso persistito nelle impostazioni. La factory ora legge
`media-pack:storage:local_root` all'inizializzazione; il test di regressione verifica
la lettura dei file esistenti in due istanze nuove senza upload o health preliminari.

Verificati login amministratore, installazione, conteggi e stati editoriali, quattro
plugin caricati, delivery pubblica, navigazione e byte media anche dopo riavvio.
Readiness HTTP 200; 31 collezioni correnti e nessuna collezione legacy nel database.
I report locali sono in `.tmp/mock-cms/result.json` e `restart-result.json`.
