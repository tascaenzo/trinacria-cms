# 0003 - Runtime deep dive: state machine, dependency graph, rollback

Questo capitolo analizza il runtime con esempi presi dal codice reale e con il modello teorico che lo giustifica.

## 1. `in-memory-plugin-runtime.ts` - struttura dati reale

Esempio dal codice reale:

```ts
private readonly records = new Map<string, PluginRuntimeRecord>();
private readonly definitions = new Map<string, KernelPluginDefinition>();
private readonly pluginModules = new Map<string, readonly ModuleDefinition[]>();
private readonly activeLoads = new Set<string>();
```

Interpretazione teorica:

- `records` e uno state store per plugin.
- `definitions` e il catalogo statico.
- `pluginModules` e la traccia operativa per unload/rollback.
- `activeLoads` e un lock set locale anti-concorrenza.

## 2. State machine formale

Esempio dal codice reale:

```ts
const ALLOWED_TRANSITIONS: Readonly<Record<PluginState, readonly PluginState[]>> = {
  registered: ["loading", "disabled"],
  loading: ["initializing", "failed"],
  initializing: ["loaded", "failed"],
  loaded: ["unloading", "disabled", "failed"],
  unloading: ["unloaded", "failed", "disabled"],
  failed: ["loading", "disabled", "unloaded"],
  disabled: ["registered"],
  unloaded: ["loading", "disabled", "registered"]
};
```

Modello teorico:

- LTS (Labeled Transition System):
  - insieme stati `S`
  - insieme azioni `A`
  - relazione transizione `T subseteq S x A x S`

Vantaggio:

- impossibile spostare plugin in stato illegale senza errore esplicito.

## 3. Pipeline `register` (ingresso nel sistema)

Esempio dal codice reale (estratto):

```ts
manifest = validatePluginManifest(definition.manifest);
assertPluginCompatibility(manifest, this.coreVersion);
this.assertDependencyGraphWithoutCycles(manifest.id, this.extractRequiredDependencies(manifest));
```

Logica teorica:

- validazione upfront = "fail fast" su precondizioni.
- controllo ciclo = proprieta aciclica del grafo dipendenze required.

## 4. Pipeline `load` (orchestrazione)

Esempio dal codice reale (estratto):

```ts
this.transition(pluginId, "loading");

if (this.moduleBridge) {
  registeredModules = await this.moduleBridge.registerModules(pluginId, definition.modules ?? []);
}

if (definition.onLoad && context) {
  await definition.onLoad(context);
}

this.transition(pluginId, "initializing");
if (definition.onInit && context) {
  await definition.onInit(context);
}
```

Modello teorico:

- orchestrazione a fasi con pre/post-condizioni.
- ogni fase puo fallire; serve compensazione.

## 5. Rollback transazionale (best effort)

Esempio dal codice reale:

```ts
private async rollbackFailedLoad(
  pluginId: string,
  definition: KernelPluginDefinition,
  context: KernelPluginRuntimeContext | undefined,
  registeredModules: readonly ModuleDefinition[],
  onLoadCompleted: boolean,
): Promise<readonly unknown[]> {
  const rollbackErrors: unknown[] = [];

  if (onLoadCompleted && definition.onUnload && context) {
    try {
      await definition.onUnload(context);
    } catch (error) {
      rollbackErrors.push(error);
    }
  }

  if (this.moduleBridge) {
    const moduleErrors = await this.moduleBridge.unregisterModules(
      pluginId,
      registeredModules,
    );
    rollbackErrors.push(...moduleErrors);
  }

  return rollbackErrors;
}
```

Modello teorico:

- compensating transaction pattern.
- non e ACID globale, ma riduce stati parziali inconsistenti.

## 6. Dependency graph e ordinamento topologico

Esempio dal codice reale (estratto):

```ts
private sortByDependencies(pluginIds: readonly string[]): string[] {
  const targetSet = new Set(pluginIds);
  const ordered: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  ...
}
```

Modello teorico:

- DFS con colorazione implicita (`visiting`, `visited`).
- rilevazione cicli quando nodo gia in `visiting`.
- ordinamento topologico per `loadMany`.

## 7. Bridge runtime -> DI engine

File: `trinacria-module-bridge.ts`

Esempio dal codice reale:

```ts
for (const module of modules) {
  if (this.isModuleRegistered(module)) continue;
  await this.app.registerModule(module);
  registered.push(module);
}
```

Esempio dal codice reale unload inverso:

```ts
for (let index = modules.length - 1; index >= 0; index -= 1) {
  const module = modules[index];
  if (!module) continue;
  if (!this.isModuleRegistered(module)) continue;
  await this.app.unregisterModule(module);
}
```

Logica teorica:

- stack discipline: unload in ordine inverso rispetto al load.

## 8. Health as derived state

File: `kernel-health-service.ts`

Esempio dal codice reale (estratto):

```ts
const hasRuntimeDegradation = records.some((record) =>
  ["failed", "disabled", "loading", "initializing", "unloading"].includes(record.state)
);

if (!db.ok && db.reason !== "not_configured") return "down";
if (hasRuntimeDegradation || hasRequiredDependencyIssue) return "degraded";
return "ok";
```

Modello teorico:

- funzione di classificazione su stato composto (runtime + dependency + db).

## 9. Starter come bootstrap automaton

File: `cms-starter.ts`

Esempio dal codice reale (estratto):

```ts
await app.registerModule(starterModule);
...
await app.start();

const runtime = await app.resolve<PluginRuntime>(CORE_TOKENS.PLUGIN_RUNTIME);
for (const plugin of plugins) {
  await runtime.register(plugin);
}
if (options.autoLoadPlugins !== false && plugins.length > 0) {
  await runtime.loadMany(plugins.map((plugin) => plugin.manifest.id));
}
```

Logica teorica:

- separazione netta tra fase bootstrap infrastruttura e fase activation plugin.

## 10. Invarianti chiave del runtime

- un plugin loaded deve avere passato `load` e `init`.
- un plugin disabled non puo essere caricato direttamente.
- unload e vietato se esistono dipendenti required loaded.
- ogni errore lifecycle produce stato osservabile (`failed`/`disabled`) e non silenzioso.

Queste invarianti sono il cuore della robustezza del kernel.

## 11. Persistenza stato runtime (`PluginRuntimeStore`)

Il runtime usa un backend astratto `PluginRuntimeStore` per persistere lo stato dei plugin installati.

Flusso operativo:

1. `register` -> upsert stato `registered`
2. `load` -> upsert stato `loaded` (o `failed` su errore)
3. `disable` -> upsert stato `disabled` (passando da `unloaded` se era `loaded`)
4. `unregister` -> delete record persistito

Implementazioni disponibili:

- `InMemoryPluginRuntimeStore` (fallback senza DB)
- `DbPluginRuntimeStore` (usa `DbAdapter`, collection `installed_plugins`)
- `DeferredPluginRuntimeStore` (lazy resolution nel bootstrap starter)

Conseguenza:

- stato plugin osservabile e persistente anche a livello operativo (audit/console/diagnostica), non solo in memoria processo.
