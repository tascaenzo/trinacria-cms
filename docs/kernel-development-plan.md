# Piano di Sviluppo Kernel (`kernel`)

Questo documento definisce il piano step-by-step per costruire il kernel del CMS basato su Trinacria.

## Obiettivo

Realizzare `kernel` come layer CMS stabile sopra Trinacria, agnostico rispetto
ai plugin dominio, con caricamento plugin a runtime, isolamento namespace,
contratti infrastrutturali e lifecycle robusto.

Trinacria resta la libreria/framework base: DI, moduli, lifecycle applicativo,
HTTP e schema tooling arrivano da `@trinacria/*`. Il `kernel` CMS non deve
duplicare Trinacria, ma specializzarlo per un prodotto CMS plugin-first.

## Step di sviluppo

1. **Scope e contratti minimi (1-2 giorni)**
   - Definire confini `Trinacria` vs `kernel` CMS vs `core-pack`.
   - Produrre `ADR-001` con decisioni architetturali.
   - Elencare interfacce target: `PluginManifest`, `PluginRuntime`, Mongo storage core, `AuthzService`, `NamespaceContext`.

2. **Skeleton package + API pubblica (1 giorno)**
   - Strutturare `packages/kernel` (`contracts`, `runtime`, `errors`, `tokens`).
   - Definire entrypoint pubblico e policy di export.

3. **Manifest plugin + compatibilità (1-2 giorni)**
   - Implementare schema manifest (`id`, `version`, `requiresCore`, `capabilities`, `dependencies`).
   - Aggiungere validazione e errori tipizzati (`PluginManifestError`, `PluginCompatibilityError`).

4. **Plugin registry runtime (2 giorni)**
   - Implementare registry con stati: `registered`, `loaded`, `failed`, `disabled`.
   - Esporre API: `register`, `load`, `unload`, `disable`, `list`.

5. **Lifecycle orchestration + rollback (2-3 giorni)**
   - Orchestrare `onRegister -> onInit`.
   - Gestire rollback transazionale in caso di errore.
   - Tracciare eventi di lifecycle in audit log.

6. **Namespace isolation (2 giorni)**
   - Definire contesto obbligatorio (`pluginId`, `workspaceId`).
   - Applicare naming policy e scoping uniforme su servizi/storage.

7. **Mongo storage core (2-3 giorni)**
   - Introdurre contratti Mongo-first per namespace, entity registry, repository, indici e mapping errori.
   - Fornire helper test senza progettare una astrazione multi-database preventiva.

8. **Security contracts (1-2 giorni)**
   - Definire contratti AuthN/AuthZ/RBAC checker.
   - Nessuna logica business nel kernel, solo interfacce e punti di integrazione.

9. **Bridge runtime con Trinacria (2 giorni)**
   - Mappare plugin su moduli Trinacria.
   - Gestire `registerModule`/`unregisterModule` runtime in modo idempotente.

10. **Observability + error model (1-2 giorni)**
    - Definire interfacce logger/metrics/audit.
    - Consolidare taxonomy errori kernel e codici coerenti.

11. **Test strategy (continuo + milestone 2 giorni)**
    - Unit test su manifest, registry, orchestrator.
    - Integration test su load/unload/rollback runtime.

12. **Freeze v0.1 kernel (1 giorno)**
    - Congelare API pubblica minima.

- Documentare contratto `Kernel v0.1` come baseline per `core-pack` e plugin dominio.

## Ordine operativo consigliato

1. Contratti base
2. Registry + lifecycle
3. Namespace + Mongo storage core
4. Bridge runtime Trinacria
5. Test + stabilizzazione

## Output atteso

Al termine del piano, `kernel` deve essere pronto per ospitare `core-pack` come plugin ufficiale e supportare plugin dominio caricabili/scaricabili a runtime in modo sicuro.
