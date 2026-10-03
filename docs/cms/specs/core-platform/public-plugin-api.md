# Public plugin API

API implementate fino ad A3/B0, aggiornate il 2 ottobre 2026. Il progetto non è mai
stato pubblicato; la [baseline](public-api/README.md) documenta export e contratti
previsti per la prima beta. Le altre specifiche M8 descrivono obiettivi futuri
quando il rispettivo task non è ancora completato.

## Import e confini

| Subpath | Uso |
| --- | --- |
| kernel/contracts | Manifest, lifecycle, PluginHostServices, DTO e OperationContext |
| kernel/plugin-api | Helper manifest/admin/security/settings/eventi, envelope e tipi dei servizi plugin; condivisibile con il browser |
| kernel/errors, kernel/tokens | Errori tipizzati e token intenzionali |
| kernel/runtime | Bootstrap e composizione privilegiata host, semver e factory d'identità; experimental |
| core-pack/plugin-api | Helper di firma delle chiamate HTTP Settings |
| pack root | Factory del plugin, manifest, DTO e contratti/token applicativi intenzionali |
| pack/runtime | Composizione host e implementazioni raw; experimental |
| pack/admin, pack/admin-manifest | Renderer e dichiarazioni admin integrati al build dell'host |

I deep import verso src/dist non esportati non sono API. Repository, container e
factory d'identità non appartengono ai servizi consegnati ai plugin.

```ts
import type { KernelPluginDefinition } from "@trinacria-cms/kernel/contracts";
import { definePluginManifest } from "@trinacria-cms/kernel/plugin-api";

const manifest = definePluginManifest({
  id: "catalog-plugin", version: "0.1.0", requiresCore: "^0.1.0"
});
export const plugin: KernelPluginDefinition = {
  manifest,
  async onLoad({ services }) {
    services.logger.info("Catalog loaded");
  }
};
```

Il manifest dichiara owner delle entità, settings, eventi, permessi e contributi
admin. `version`, `requiresCore` e dependency.versionRange usano la semantica npm
rigorosa: prerelease solo quando ammesse dal range; caret 0.x limitato alla minor
compatibile. Dichiarazione di permessi/capability e concessione effettiva sono distinte.

## Servizi plugin

Il lifecycle riceve `{ pluginId, manifest, i18nSources, services }`. Storage è limitato
all'owner del plugin; gli eventi verificano policy alla consegna; Settings consente
le chiavi proprie dichiarate, senza segreti plaintext. Logger e requestId sono
assegnati dall'host. Le operazioni nominate attraversano contratti applicativi A3:

```ts
const entry = await services.operations.call("editorial-pack", "entries.create", {
  contentTypeId: "article-model", data: { title: "Hello" }
});
```

La chiamata richiede dipendenza dichiarata, owner attivo e contratto pubblico; non concede
accesso perché il producer è installato. Identità e OperationContext sono fissati
dall'host. Non passare userId, principal, admin o delega nei payload per acquisire
privilegi. Una delega host valida controlla diritti e ACL di entrambe le identità.

Errori runtime/API hanno codici stabili. `operation_forbidden` è redatto e diventa
HTTP 403. Errori di validazione/conflitto dei domini conservano la propria semantica.
L'[inventario applicativo](../../architecture/plugin-platform/application-operation-inventory.md)
elenca le operazioni A3, i permessi e i limiti transazionali. Il client vault consuma
payload con CAS, identità fissa e keyring; nessun fallback dopo un claim perso.

## Verificare i contratti

`npm run build && npm run public-api:check` controlla gli otto package, i manifest,
i range Core/plugin/admin e la fixture TypeScript, inclusi import proibiti.
`npm run sdk:check` verifica SDK/OpenAPI; B1 estende il catalogo a Editorial e overlay.
La baseline registra simbolo, subpath e stato; le modifiche deliberate richiedono
snapshot, consumer e changelog aggiornati insieme.

La beta attuale esegue codice plugin fidato nello stesso processo. Questi confini
sono contratti tra estensioni fidate nello stesso processo, senza una sandbox.

B1 consegnato: SDK ufficiale include Editorial, Media ed Email; `/runtime` SDK e CLI
overlay sono disponibili. La generazione valida schemi/ID/output e il bootstrap verifica
la copertura OpenAPI contro le route effettive. Dettagli in `packages/sdk/README.md`.
