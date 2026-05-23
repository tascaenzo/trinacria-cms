# M4 - Core Platform Foundation

Stato: `in corso`

## Checklist iniziale

- [x] Definire filosofia plugin-first e confini tra Trinacria, kernel, core-pack e plugin.
- [x] Chiudere le specifiche low-level della piattaforma core.
- [x] Formalizzare manifest plugin, contribution catalog e API pubbliche per sviluppatori plugin.
- [x] Implementare i contratti fondativi: manifest target, namespace validator, collision policy.
- [x] Integrare il namespace validator nel runtime plugin.
- [x] Aggiungere diagnostica admin per le contribution plugin.
- [x] Aggiungere test limite su runtime store in-memory e DB-backed.
- [x] Verificare l'integration Mongo reale per i casi limite del runtime store.
- [x] Introdurre discovery plugin configurata da sorgenti esplicite.
- [ ] Implementare discovery/loading reale dei plugin dentro la stessa M4.
- [ ] Implementare provisioning security completo da manifest plugin.
- [ ] Stabilizzare il primo flusso end-to-end di install/enable/disable plugin con Mongo.

## Riepilogo attuale

M4 ha cambiato direzione: non e piu una milestone editoriale, ma la fondazione
core della piattaforma plugin-first. Il dominio editoriale resta fuori dal core
e verra ripreso solo quando il runtime plugin sara sufficientemente reale.

Sono stati introdotti:

- documentazione core platform low-level;
- manifest plugin esteso con `entities`, `settings`, `events`, `admin` e `security`;
- contribution catalog runtime e endpoint di lettura;
- pagina admin diagnostica per le contribution;
- namespace validator side-effect free;
- collision detection cross-plugin integrata nel runtime;
- contract test condivisi su runtime store memoria/DB-backed;
- integration test Mongo reale per cleanup campi opzionali;
- fix Mongo `$unset` per evitare campi runtime obsoleti dopo transizioni di stato.
- `ConfiguredPluginDiscoveryService` e `pluginSources` nello starter CMS per
  caricare plugin da sorgenti esplicite `workspace`, `package` e `local-path`.

## Check eseguiti

- `npm run lint`
- `npm run build`
- `npm test`
- `npm run typecheck -w @trinacria-cms/kernel`
- `npm run test -w @trinacria-cms/kernel`
- `TRINACRIA_RUN_MONGO_INTEGRATION=1 npm run test:integration -w @trinacria-cms/kernel`

## Prossimo blocco M4

Il prossimo blocco resta dentro M4 ed e il runtime plugin reale end-to-end:
endpoint diagnostico delle source, audit/persistenza delle discovery, loading da
configurazione/package, compatibilita, failure mode e persistenza Mongo.
