# D0 — Starter catalogo e conformità di un plugin esterno

## Obiettivo

Consegnare il blocco D0 del piano tecnico, applicando decisioni e criteri della specifica collegata.

## Area

`kernel | sdk | backoffice | docs | infra`

## Milestone

[M8 — Piattaforma plugin pubblica](../../milestones/M8-public-plugin-platform.md).
Stato: nove scenari automatici esterni e recovery completi il 5 ottobre 2026; prova umana indipendente aperta.
Responsabile: owner dei package indicati nell'area; reviewer dei contratti kernel/Core.

## Specifica esecutiva

[Starter catalogo e conformità di un plugin esterno](../../../docs/cms/architecture/plugin-platform/api-sdk-and-release.md).
[Piano e registro decisioni](../../../docs/cms/architecture/plugin-platform-implementation-plan.md).
La specifica fissa semantiche, errori, contratti target, default, recovery e acceptance;
questa scheda ne organizza gli incrementi, senza introdurre alternative architetturali.

## Dipendenze

B2 e contratti A0/A3; gate finale G2 dopo C0/C1/C2.

## Scope e incrementi

- [x] Creare catalog-plugin e consumer separato, CRUD/settings/eventi/widget e upgrade dati.
- [x] CLI create-trinacria-plugin safe su directory nuova, template versionato e configurazione backend/admin.
- [x] Tool conformità statico e runner di scenari espliciti; output incomplete finché i nove scenari non sono eseguiti.
- [x] Fixture da pacchetti fisici, senza import interni, con tutti i nove scenari obbligatori.
- [ ] Esecuzione CI remota sul candidato e prova umana di un autore che non ha scritto lo starter.
- [ ] Registrare ostacoli e correggere guide EN/IT; nessuna modifica kernel durante prova.

Fuori scope: gli altri blocchi M8, salvo integrazioni necessarie dichiarate nella specifica.
Ogni incremento deve avere test e consumer aggiornati; recupero dati di sviluppo solo se richiesto, senza reset automatici; non segnare il task done dopo il solo scaffolding.

## File impattati

Nuovo starter/CLI/conformance, fixtures esterne, examples e guide sviluppatore.
I path sotto kernel/Core/pack sono relativi a `packages/`; i nuovi moduli mantengono
la struttura esistente e i contratti pubblici definiti nella specifica.

## Check e criterio di chiusura

Installazione da tarball, plugin completo e consumer, upgrade/disable/remove con dati esistenti; compilazione SDK overlay e host admin.

- Test mirati e integrazioni reali del requisito, inclusi casi negativi e recovery.
- `npm run check` e `npm run build` con Node di `.nvmrc`.
- SDK check per API/generatore; Chromium per i flussi modificati; Storybook per UI/renderer.
- Documentazione, checklist e changelog aggiornati; risultati e skip registrati.
- Chiudere solo dopo gli acceptance della specifica e le dipendenze richieste dal relativo gate.


## Incremento corrente

`examples/catalog-plugin` offre CRUD, facade autorizzata, settings, evento protetto
async atomico, pagina/widget; `examples/catalog-consumer` usa soltanto contratti
kernel, owned inbox storage e operazione cross-plugin esplicita separata dal handler.
Kernel distribuisce create-trinacria-plugin e cms-plugin-conformance, template v1
con controllo di allineamento CI. Generazione non esegue npm/script e non sovrascrive.
Il tool distingue contratto statico da suite completa con scenari espliciti obbligatori;
non certifica sicurezza. Test locali passati per negative authz, schema, directory,
overwrite/symlink e incompatibilità. `npm run release:test` verificato: pacchetti fisici,
overlay TypeScript eseguito contro HTTP, CRUD Chromium/conflitto/API down, reload,
uninstall con dati conservati e upgrade catalogo 0.1→0.2 via migrations CLI, con nuovo
host avviato sui dati conservati e campo currency verificato via HTTP. Verificati anche
permessi operativi deliveries/email-jobs e revoca dei settings alla generation precedente.
Il modulo `catalog-conformance.mjs` esegue tutti i nove scenari nella CLI distribuita:
`status:passed, complete:true`, teardown riuscito e report con durate. Include il restore
reale di 27 collection, 69 indici, media e configurazione su DB dedicato, seguito da
login, verifica dei dati e salute del kernel. Il controllo statico da solo resta incompleto.
La prova umana e la CI remota restano aperte: G2 non è dichiarato soddisfatto.
Usare il [registro singola istanza](../../../docs/cms/architecture/plugin-platform/single-instance-acceptance.md).
