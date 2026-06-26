# 0019 - Admin manifest e backoffice declarative

## 1. Obiettivo

Questo capitolo documenta la nuova architettura del backoffice modulare:

```text
plugin -> AdminExtensionManifest -> sanitizer -> SafeAdminExtensionManifest -> registry -> renderer declarative
```

L'obiettivo e permettere ai plugin di esporre pagine, menu, risorse, widget,
settings e azioni senza modificare il codice del backoffice.

## 2. Confini

### `admin-kernel`

Possiede:

- contratti TypeScript admin;
- sanitizer e policy endpoint;
- normalizer manifest;
- registry capability-aware;
- renderer declarative;
- supporto a contribution React custom locali.

Non possiede:

- la lista reale dei plugin installati;
- la fonte autoritativa dei manifest plugin;
- authorization backend;
- business logic dei plugin.

### Plugin/backend

Possiede:

- manifest admin serializzabile;
- endpoint dati;
- endpoint azioni;
- validazione server-side;
- permission/capability enforcement;
- audit delle mutazioni.

## 3. Manifest vs contributions

`manifests` e il percorso standard e scalabile.

`contributions` e un escape hatch React non serializzabile.

Usa `manifests` per:

- pagine resource standard;
- voci menu;
- dashboard widget;
- settings section;
- azioni CRUD o operative dichiarative;
- UI che puo essere generata da schema/metadati.

Usa `contributions` solo per:

- componenti React custom locali;
- editor visuali complessi;
- workflow che non si descrivono bene in JSON;
- prototipi host-specific.

Regola pratica: se una UI deve arrivare da API plugin, deve essere manifest. Se
richiede codice React importato nel bundle host, e contribution.

## 4. Struttura file attuale

```text
packages/admin-kernel/src/contracts/
  access.ts
  action.ts
  endpoint.ts
  manifest.ts
  navigation.ts
  page.ts
  registry.ts
  resource.ts
  settings.ts
  widget.ts

packages/admin-kernel/src/runtime/
  admin-endpoint-policy.ts
  admin-manifest-sanitizer.ts
  admin-extension-manifest.ts
  admin-route-runtime.ts

packages/admin-kernel/src/declarative/
  components/
  hooks/
  utils/
  types.ts
  index.ts
```

`contracts.ts` e `declarative/admin-declarative-renderers.tsx` restano barrel di
compatibilita.

## 5. Pipeline manifest

```ts
const safe = toSafeAdminExtensionManifest(rawManifest);
const contribution = normalizeAdminExtensionManifest(safe);
```

Oppure, per il percorso convenience:

```ts
const contribution = normalizeSafeAdminExtensionManifest(rawManifest);
```

Il normalizer puro accetta `SafeAdminExtensionManifest`. Questo impedisce di
normalizzare accidentalmente un manifest non sanificato.

## 6. Security policy

Il manifest non e affidabile finche non passa dal sanitizer.

La policy default accetta solo endpoint relativi nel namespace `/admin`.

Bloccati:

- `https://evil.test/...`
- `//evil.test/...`
- path senza `/`
- path con `..`
- path con `%2e` o `%2f`
- caratteri control/backslash
- data endpoint non `GET`
- action `GET`
- action senza guards esplicite

Questa policy protegge il frontend da manifest pericolosi, ma non e enforcement
finale. Il backend deve sempre validare auth, permission e body.

## 7. Renderer declarative

Il renderer supporta:

- pagine declarative generiche;
- pagine resource;
- tabelle resource read-only con dati reali se endpoint disponibile;
- settings section readonly da JSON schema;
- dashboard widget metric/status/card/list/chart base;
- action panel con modale di conferma;
- body draft da schema o record;
- path params tipo `/items/:id`;
- refetch dopo action riuscita.

Il renderer non deve contenere logica business plugin.

## 8. Azioni declarative

Un'action e metadata UI + endpoint binding.

Esempio:

```ts
{
  id: "update-status",
  intent: "update",
  title: "Update status",
  endpoint: { method: "PATCH", path: "/admin/catalog/products/:id/status" },
  input: {
    schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "disabled"] }
      }
    }
  },
  guards: [{ capability: "catalog.products.write" }]
}
```

Il frontend:

1. mostra `Prepare`;
2. apre modale;
3. genera body JSON;
4. valida che il body sia JSON;
5. risolve path params da body o record;
6. invia request SDK;
7. mostra response;
8. fa refetch dopo successo.

Il backend deve comunque:

- controllare permission;
- validare payload;
- impedire campi non ammessi;
- scrivere audit log.

## 9. Endpoint API target

Il catalogo diagnostico esistente `/v1/system/plugin-contributions` non deve
diventare la fonte UI eseguibile.

Per i manifest admin runtime va previsto un endpoint separato, ad esempio:

```text
GET /admin/extensions
```

Requisiti:

- admin-auth;
- filtro per permission utente;
- solo plugin loaded;
- manifest gia validati lato backend;
- nessun secret;
- endpoint ammessi solo in namespace sicuro.

## 10. Anti-pattern

Da evitare:

- eseguire endpoint assoluti dal manifest;
- fidarsi dei guards frontend come authorization reale;
- mettere componenti React plugin dentro manifest JSON;
- aprire genericamente tutto `/v1` alla policy declarative;
- usare `contributions` per casi standard che possono essere manifest;
- duplicare policy endpoint tra frontend e backend senza fonte comune.

## 11. Test da conoscere

- `admin-endpoint-policy.test.ts`: policy sicurezza endpoint.
- `admin-extension-manifest.test.ts`: sanitize + normalize.
- `admin-declarative-renderers.test.ts`: renderer e utility action.
- `admin-route-runtime.test.ts`: registry, guards, visibility, actions.

## 12. Stato attuale

Implementato:

- contratti separati;
- safe manifest;
- sanitizer;
- renderer declarative modulare;
- action controller;
- refetch post-action;
- test e build verdi.

Da fare:

- endpoint backend runtime manifest;
- core-pack espone i propri manifest admin via backend;
- form editabili tipizzati da schema;
- audit server-side specifico per action declarative.
