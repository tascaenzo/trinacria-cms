# M8 — Piattaforma plugin pubblica

## Obiettivo

Rendere il CMS utilizzabile da autori esterni con contratti stabili, sicurezza esplicita,
upgrade recuperabili e packaging autonomo; separare i gate sito pubblico e multi-replica.

Nessun rilascio precedente: modifiche incompatibili consentite con tutti i consumer
aggiornati; nessuna finestra di deprecazione. Recupero dati di sviluppo opzionale.

## Decisione del 3 ottobre 2026

Percorso standard: [plugin fidati](../../docs/cms/architecture/plugin-platform/trusted-plugin-model.md),
policy sui contratti senza grant DB, lifecycle locale e cluster esplicito.

## Stato

In corso. Approfondimenti e decisioni tecniche completati il 1 ottobre 2026;
A0/A1/A2/A3/B0/B1/B2 implementati e verificati (A3 il 2 ottobre 2026); C0/C2 hanno codice e prove Mongo/CLI, C1 è collegato e verificato localmente;
D0 ha superato fixture tarball, overlay/browser, upgrade 0.1→0.2 e suite
di riferimento completa dei nove scenari con restore; prova umana aperta. E0 ha snapshot/delivery/preview, SDK, backoffice
e app SSR verificati, inclusi browser, cache C1, Storybook e ripristino snapshot; deployment
del team aperto. Le acceptance sono elencate nei task; nessun task è dichiarato
completato dalla sola documentazione.

[Piano tecnico](../../docs/cms/architecture/plugin-platform-implementation-plan.md) ·
[Checklist](../../docs/cms/architecture/plugin-platform-operational-checklist.md).

## Task inclusi

- [x] [A0 — plugin-host-context-and-storage-boundaries](../tasks/done/2026-10-01-plugin-host-context-and-storage-boundaries.md)
- [x] [A1 — plugin-event-authorization-hardening](../tasks/done/2026-10-01-plugin-event-authorization-hardening.md)
- [x] [A2 — secure-payload-atomic-claim-and-keyring](../tasks/done/2026-10-01-secure-payload-atomic-claim-and-keyring.md)
- [x] [A3 — application-operation-authorization](../tasks/done/2026-10-02-application-operation-authorization.md)
- [x] [B0 — public-exports-semver-and-compatibility](../tasks/done/2026-10-02-public-exports-semver-and-compatibility.md)
- [x] [B1 — editorial-openapi-sdk-and-overlay](../tasks/done/2026-10-01-editorial-openapi-sdk-and-overlay.md)
- [x] [B2 — plugin-packaging-and-external-host](../tasks/done/2026-10-01-plugin-packaging-and-external-host.md)
- [x] [Semplificazione — plugin fidati e lifecycle locale](../tasks/done/2026-10-03-trusted-plugin-runtime-simplification.md)
- [x] [Pulizia del codice e dei documenti](../tasks/done/2026-10-03-plugin-code-and-docs-cleanup.md)
- [ ] [C0 — plugin-migrations-and-uninstall](../tasks/todo/2026-10-01-plugin-migrations-and-uninstall.md)
- [ ] [C2 — shared-plugin-security-and-cluster-state](../tasks/todo/2026-10-01-shared-plugin-security-and-cluster-state.md)
- [ ] [C1 — durable-plugin-events-and-email-jobs](../tasks/todo/2026-10-01-durable-plugin-events-and-email-jobs.md)
- [ ] [D0 — external-plugin-starter-and-conformance](../tasks/todo/2026-10-01-external-plugin-starter-and-conformance.md)
- [ ] [E0 — public-editorial-site-and-preview](../tasks/todo/2026-10-01-public-editorial-site-and-preview.md)

## Dipendenze e sequenza

A0/A1 → A2/A3 → B0/B1 → B2; C0/C2 → C1; D0 integra la beta esterna.
E0 ha un gate di prodotto dedicato; dipendenze complete nei task e nel piano.
A0 attiva direttamente naming e ownership persistente; C0 riusa il bootstrap degli indici
nel runner di upgrade futuri. Recupero di dati di sviluppo separato e opzionale.

## Criteri di chiusura

- G1 coperto il 2 ottobre 2026: A0/A1/A2/A3 e test negativi/concorrenza/identity, con confini di fiducia dichiarati.
- G2: B0/B1/B2/D0, C0 e C1 per i flussi durevoli; store persistiti di sicurezza.
  Il coordinamento C2 tra istanze riguarda G3.
- G3: prove multi-replica, outage, fencing, maintenance e recovery.
- G4: verticale sito pubblico E0 validato.
- Documentazione EN/IT, runbook e changelog corrispondono agli artefatti consegnati.

M8 include tutte le evoluzioni richieste: il primo rilascio beta G2 può avvenire prima
che E0 sia completato, ma la milestone complessiva non viene chiusa anticipatamente.


Il [registro operativo singola istanza](../../docs/cms/architecture/plugin-platform/single-instance-acceptance.md)
assegna procedure ed evidenze per chiudere primo avvio, lifecycle, recovery e G2.
Lo staging non è ancora assegnato; CI remota, partecipante indipendente e reviewer
rimangono da registrare. Non richiedere G3 per il normale host a singola istanza.
