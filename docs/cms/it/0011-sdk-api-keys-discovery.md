# 0011 - SDK ufficiale, discovery runtime e API key

Questo capitolo collega tre concetti che in produzione lavorano insieme:

- SDK pubblicato e riusabile fuori dal monorepo
- discovery runtime per capire quali plugin e capability sono davvero attivi
- API key come identita macchina di primo livello

## 1. Problema architetturale

Un CMS plugin-based ha due esigenze in tensione:

1. offrire un SDK stabile, semplice da usare e pubblicabile su npm;
2. permettere a ogni installazione di aggiungere plugin custom che lo SDK pubblico non puo conoscere in anticipo.

Se si usa solo uno SDK generato progetto per progetto, si perde portabilita fuori dal monorepo.

Se si usa solo uno SDK statico pubblicato, non si riescono a tipizzare i plugin custom.

La soluzione adottata e ibrida.

## 2. Modello a due livelli

### Livello 1: SDK ufficiale pubblicato

Package:

- `@trinacria-cms/sdk`

Contiene:

- runtime client zero-deps
- gruppi API ufficiali del kernel
- gruppi API ufficiali del `core-pack`
- helper di discovery runtime

Vantaggio:

- puo essere usato subito anche in un progetto esterno al monorepo.

### Livello 2: overlay generato nel monorepo

Origine:

- snapshot OpenAPI reale dell'applicazione

Contiene:

- plugin custom
- moduli custom applicativi
- eventuali endpoint ufficiali estesi o ridefiniti dal progetto

Vantaggio:

- il monorepo ottiene typing completo anche per le estensioni locali.

## 3. Catalogo ufficiale dello SDK

Il package pubblicato espone un catalogo statico:

- file: `packages/sdk/src/official/official-plugin-catalog.ts`

Concettualmente descrive:

- quali plugin ufficiali sono coperti
- quali gruppi API sono sempre presenti nel package

Esempio attuale:

- `kernel` -> `kernelHealth`, `system`
- `core-pack` -> `auth`, `installation`, `users`, `roles`, `permissions`, `settings`, `security`, `apiKeys`

Importante:

- il catalogo statico dice cosa sa fare lo SDK;
- non dice quali plugin siano installati davvero in una specifica istanza.

Per questo serve la discovery runtime.

## 4. Discovery runtime

Endpoint built-in del kernel:

- `GET /v1/system/plugins`
- `GET /v1/system/capabilities`

Scopo:

- permettere a SDK, pannelli admin e CLI di interrogare il profilo reale dell'istanza in esecuzione.

### 4.1 `GET /v1/system/plugins`

Restituisce:

- plugin installati
- versione
- stato lifecycle
- capability dichiarate
- dipendenze
- metadati security aggregati

Uso tipico:

- costruire menu o sezioni UI solo se il plugin e presente e `loaded`.

### 4.2 `GET /v1/system/capabilities`

Restituisce:

- elenco piatto di capability pubblicate dai plugin installati

Uso tipico:

- verificare se una feature e disponibile senza conoscere in anticipo l'intero grafo plugin.

## 5. Flusso completo lato SDK

Esempio concettuale:

```ts
import {
  createCmsSdkClient,
  hasCapability,
  isPluginInstalled,
} from "@trinacria-cms/sdk";

const cms = createCmsSdkClient({
  baseUrl: "http://127.0.0.1:3000",
  credentials: "include",
});

const plugins = await cms.system.listInstalledPlugins();
const capabilities = await cms.system.listInstalledCapabilities();

const hasCorePack = isPluginInstalled(plugins.data, "core-pack");
const canUseSettings = hasCapability(
  capabilities.data,
  "core-pack",
  "settings.service",
);
```

Logica:

1. lo SDK conosce il contratto ufficiale;
2. la discovery runtime dice cosa e attivo davvero;
3. il client frontend/backend decide quali feature esporre o usare.

## 6. API key: perche non bastano i JWT utente

I JWT utente risolvono la sessione di una persona autenticata.

Non risolvono bene:

- integrazioni server-to-server
- job schedulati
- webhook consumer
- backoffice esterni
- script CI/CD

Per questi casi il sistema espone API key amministrabili dal `core-pack`.

## 7. Modello dati delle API key

Collection:

- `plugin_core_pack__api_keys`

Campi concettuali:

- `id`
- `lookupId`
- `name`
- `kind` (`publishable` | `secret` | `service`)
- `status` (`active` | `revoked`)
- `hash`
- `roleCodes[]`
- `permissionKeys[]`
- `policyRules[]`
- `expiresAt?`
- `lastUsedAt?`

Punto chiave:

- il secret raw non viene persistito;
- viene salvato solo l'hash.

## 8. API key e motore authz unificato

La scelta importante non e creare un secondo sistema permessi.

La scelta corretta e:

- riusare lo stesso motore authz di utenti, ruoli, permessi e policy rules;
- cambiare solo il subject.

Formato subject macchina:

- `api-key:<id>`

Effetto:

- un utente JWT e una API key vengono trattati da uno stesso servizio di autorizzazione;
- cambia la sorgente del materiale authz, non la teoria formale di evaluation.

## 9. Endpoint API key

Route attuali:

- `GET /v1/api-keys`
- `GET /v1/api-keys/:id`
- `POST /v1/api-keys`
- `POST /v1/api-keys/:id/rotate`
- `POST /v1/api-keys/:id/revoke`

Protezione attuale:

- admin JWT

Interpretazione:

- un amministratore umano crea o ruota credenziali macchina;
- le integrazioni usano poi la chiave per chiamare il CMS.

## 10. Uso dello SDK con API key

Esempio:

```ts
import { createCmsSdkClient } from "@trinacria-cms/sdk";

const cms = createCmsSdkClient({
  baseUrl: "http://127.0.0.1:3000",
  apiKey: "cms_sk_lookup_secret",
});

const health = await cms.kernelHealth.getKernelHealth();
```

Header default:

- `x-api-key`

Override possibile:

- `apiKeyHeaderName`

## 11. Strategia consigliata per team monorepo

1. usare sempre `@trinacria-cms/sdk` come base stabile
2. rigenerare l'overlay OpenAPI solo quando servono plugin custom
3. usare la discovery runtime per adattare la UI all'istanza reale
4. usare API key per integrazioni macchina, non JWT utente riciclati

## 12. Formula mentale finale

La combinazione corretta e:

- SDK ufficiale = contratto pubblico stabile
- discovery runtime = fotografia del sistema reale
- overlay generato = typing locale del monorepo
- API key = identita macchina governata dallo stesso motore authz del dominio umano
