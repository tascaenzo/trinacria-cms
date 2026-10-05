# Nomi leggibili per le collection Mongo

Richiesta: rendere riconoscibile il contenuto delle collection, aggiungendo il plugin
come suffisso e conservando il database mock del CMS.

## Implementazione

- Naming `<entity>__plugin_<pluginId>`, con suffisso workspace opzionale.
- Escaping reversibile dei caratteri riservati e dei separatori, senza normalizzazione
  lossy tra plugin `a-b`/`a_b` o workspace distinti.
- Registry ownership, indici unique e verifiche dell'owner invariati.
- Il runtime rifiuta i vecchi layout prima di creare nuove collection; nessun fallback
  o adapter aggiuntivo per compatibilità pre-release.
- Guide EN/IT, schema operativo, README kernel e decisioni storage allineati.

## Database locale

Salvato backup sotto `.tmp/db-backups/`. Rinominate tutte le 31 collection di
`trinacria_cms` secondo i proprietari del registro, incluso il registro stesso.
Aggiornati 30 mapping. Verificati conteggi, impronte dei documenti applicativi e indici,
senza modificare account, ID, password, media o pubblicazioni.
Piano, avanzamento e report locali in `.tmp/readable-storage/`.

Verificato il riavvio del playground dalla sua directory normale: login, quattro
plugin caricati, tredici contenuti (dieci pubblicati, due bozze, uno in revisione),
tre media pubblici, navigazione, impostazioni e readiness HTTP 200.
Restano un solo database applicativo e i database interni Mongo.

Test del naming: leggibilità, distinzione degli identificatori e escaping dei separatori.
Integrazioni Mongo: proprietà, workspace, rollback transazionale e rifiuto dei layout
precedenti senza cancellare i documenti.

Build e check completi passati: 598 test, 33 opt-in non attivati. Integrazioni Mongo:
43 passate, due non attivate (Redis/S3). Contratti pubblici invariati. Inventario finale
ricontrollato dopo i test: 31 collection leggibili, 30 mapping ownership validi,
quattro utenti, tredici contenuti e nessun database temporaneo residuo.

Vedi [regole ed esempi](../../../docs/cms/architecture/plugin-platform/collection-naming.md).
