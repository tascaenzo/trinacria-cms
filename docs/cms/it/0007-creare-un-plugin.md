# 0007 - Come progettare un nuovo plugin in modo professionale

Questo capitolo descrive lo standard pratico per creare plugin compatibili con il kernel e con il provisioning security del `core-pack`.

## 1. Decisione iniziale

Un dominio merita un plugin separato se:

- ha lifecycle indipendente
- puo essere caricato/scaricato senza fermare il CMS
- espone capability utili ad altri plugin

## 2. Scaffold raccomandato

Esempio: `packages/blog-pack`

Struttura minima:

- `src/plugin/`
- `src/modules/`
- `src/index.ts`
- `test/`

Pattern modulo:

- `schemas.ts`
- `dto/`
- `repository.ts`
- `service.ts`
- `controller.ts`
- `module.ts`

## 3. Identita e manifest

### 3.1 Costante plugin

Definisci una sola costante:

- `BLOG_PACK_PLUGIN_ID = "blog-pack"`

### 3.2 Manifest minimo

Campi base:

- `id`
- `version`
- `requiresCore`
- `capabilities`
- `dependencies`

### 3.3 Cataloghi security esportati dal core-pack

`core-pack` esporta cataloghi tipizzati per evitare stringhe duplicate:

- `CORE_PACK_CAPABILITY_LIST`
- `CORE_PACK_PERMISSION_KEYS`
- `CORE_PACK_PERMISSION_DEFINITIONS`

Esempio:

```ts
import {
  CORE_PACK_CAPABILITY_LIST,
  CORE_PACK_PERMISSION_KEYS,
} from "@trinacria-cms/core-pack";
```

## 4. Manifest security (nuovo standard)

Se il plugin aggiunge permessi o contribuisce ruoli, usa `manifest.security`:

- `permissions[]`
- `roles[]`
- `grants[]`
- `policyRules[]` (facoltativo, per `allow/deny` wildcard e condizioni)

Regole:

- permission key obbligatoria: `<pluginId>:<resource>:<action>`
- i grant devono usare permission key owned dal plugin
- `permissionPattern` in `policyRules`: `<pluginId>:<resource|*>:<action|*>`
- se usi security, dichiara dipendenza da `core-pack`

Esempio sintetico:

```ts
security: {
  permissions: [
    { key: "blog-pack:posts:read", displayName: "Read posts" },
    { key: "blog-pack:posts:publish", displayName: "Publish posts" }
  ],
  grants: [
    {
      roleCode: "editor",
      permissionKeys: [
        "blog-pack:posts:read",
        "blog-pack:posts:publish"
      ]
    }
  ],
  policyRules: [
    {
      roleCode: "editor",
      effect: "deny",
      permissionPattern: "blog-pack:posts:delete"
    },
    {
      roleCode: "editor",
      effect: "allow",
      permissionPattern: "blog-pack:posts:read",
      conditions: ["resource_id_required"]
    }
  ]
}
```

## 5. Root module

`BlogPackRootModule` deve fare composizione, non business logic.

## 6. Dominio interno

Repository:

- usa `DbAdapter` e `createPluginDbScope`

Service:

- contiene policy applicative

Controller:

- parse DTO input
- risposta con `createPluginApiResponder(pluginId)`
- route docs OpenAPI

## 7. Lifecycle runtime e provisioning

Con `startCmsApp(...)`:

- il plugin viene caricato dal runtime
- l'hook runtime `onAfterLoad` invoca `PluginSecurityProvisioner`
- il manifest security viene sincronizzato in Mongo (`permissions/roles` + grants embedded nei ruoli)
- incluse eventuali `policyRules` (`allow/deny`, wildcard, condizioni)

Su unregister:

- hook `onBeforeUnregister` invoca `deprovision(...)`

## 8. Checklist pre-rilascio

1. manifest valido (`validatePluginManifest`)
2. key permission namespaced corrette
3. dipendenza `core-pack` presente se usi `security`
4. typecheck/test verdi
5. smoke API su playground
6. endpoint presenti in OpenAPI

## 9. Anti-pattern da evitare

- usare permission key non namespaced
- modificare direttamente ruoli altrui senza grants
- saltare `dependencies` e contare sull'ordine manuale di load
- mettere logica business nei controller

## 10. Conclusione

Un plugin moderno in Trinacria CMS e contract-first: dichiara cosa offre (`capabilities`) e cosa contribuisce alla security (`manifest.security`), lasciando al runtime la sincronizzazione coerente.
