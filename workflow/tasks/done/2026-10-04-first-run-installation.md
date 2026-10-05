# Primo avvio verificato e riprendibile

Richiesta: completare le sei migliorie al processo di installazione senza eliminare
il database mock esistente. Stato: implementato, 2026-10-04.

## Risultato

1. Stato automatico da Mongo e runtime persistente anche prima dell'installazione.
   Eliminata la dipendenza dal flag ambientale di installazione nei processi,
   script e runbook; il test host dimostra che un vecchio flag errato viene ignorato.
2. Requisiti verificati: connessione, transazioni, scrittura con rollback e keyring.
   URI malformato o chiavi mancanti producono la guida; nessun plugin viene caricato.
   Un file `.env` non è obbligatorio se il processo riceve le variabili direttamente.
3. Lease condiviso, rinnovo e fencing nelle transazioni core. Ripresa con le
   credenziali originali e scelta dei dati conservata, senza duplicati.
4. Admin, credenziali, ruolo, impostazioni, outbox e checkpoint core atomici.
   Gli errori nelle impostazioni interrompono il bootstrap e annullano la transazione.
5. Scelta CMS vuoto / due bozze demo. Aggiunto `onInstall` idempotente e rimosso
   il seed editoriale automatico da `onLoad`.
6. Verifica finale di admin, impostazioni, plugin e servizi; schermata di completamento
   prima dell'accesso al backoffice. SDK/OpenAPI, traduzioni e inventario API aggiornati.

## Verifica

- Build, formattazione, lint, tipi, dipendenze, confini, SDK e contratti pubblici.
- 601 test ordinari superati; 34 test di integrazione disattivati nella suite ordinaria.
- 43 integrazioni Mongo dei pacchetti superate; Redis/S3 esclusi perché non attivati.
- Test host aggiuntivo su DB temporaneo: URI invalido, chiavi mancanti, installazione
  vuota, riavvio, stato conservato nella guida, drop DB, demo interrotta e ripresa.
- 21 test Chromium superati, incluso il passaggio finale al backoffice.
- Riavvio del mock corrente: quattro utenti, tre modelli, 13 contenuti
  (10 pubblicati, due bozze, uno in revisione), tre media leggibili, quattro plugin,
  navigazione e impostazioni conservate, readiness 200. Unico DB applicativo:
  `trinacria_cms`, 31 collection leggibili.

Runtime di verifica: Node 24.21.0 temporaneo, senza sostituire il runtime dell'utente.
I test con server locali richiedono esecuzione fuori dal sandbox; tutti i DB di test
sono stati eliminati. Il mock non è stato resettato.

## Documentazione

[Specifica operativa](../../../docs/cms/specs/core-platform/installation-bootstrap.md)
con flusso, controlli, errori, transazioni, ripresa e contratto degli hook per i plugin.
