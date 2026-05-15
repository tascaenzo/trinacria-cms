# 0015 - Operazioni plugin e troubleshooting

## Obiettivo

Descrivere come osservare e amministrare i plugin installati usando la stessa semantica del runtime, delle API `kernel` e del backoffice.

## 1. Modello operativo reale

Il runtime non espone un marketplace generico.

Espone invece una superficie amministrativa coerente con quello che sa fare davvero:

- discovery plugin installati;
- stato lifecycle leggibile;
- capability e dipendenze visibili;
- operazioni runtime supportate;
- diagnostica minima per failure, disabled state ed eventi recenti.

Le operazioni oggi supportate sono:

- `load`
- `unload`
- `reload`
- `disable`
- `enable`

Non sono esposti in `v1`:

- installazione da registry remoto;
- `unregister` da backoffice;
- bypass di dipendenze o stati non sicuri.

## 2. Endpoint canonici

Tutto passa dagli endpoint `kernel`:

- `GET /v1/system/plugins`
- `GET /v1/system/plugins/:pluginId`
- `POST /v1/system/plugins/:pluginId/operations`
- `GET /v1/system/plugins/:pluginId/events`
- `GET /v1/system/capabilities`

La pagina admin `Plugins` usa gli stessi endpoint, non una semantica UI dedicata.

Questa superficie e admin-only.

Nel setup ufficiale il `kernel` non importa direttamente il layer auth del `core-pack`.
Riceve invece un bridge esplicito (`KernelAdminRouteGuard`) fornito dal modulo auth del `core-pack`, che applica il middleware JWT admin e dichiara la stessa requirement anche in OpenAPI.

## 3. Cosa leggere in uno snapshot plugin

Campi operativi principali:

- `state`: stato lifecycle corrente;
- `statusReason`: spiegazione leggibile dello stato;
- `operations[]`: azioni ammesse in questo momento;
- `failureCount`, `lastFailurePhase`, `failedAt`: contesto failure;
- `disabledReason`, `disabledAt`: contesto disable;
- `dependencies[]`: dipendenze dichiarate con stato operativo (`ok`, `missing`, `disabled`, `version-mismatch`);
- `lastError`: ultimo errore noto serializzato in forma utile;
- `capabilities[]`: capability pubblicate dal plugin.

Regola pratica:

- decidere le azioni partendo da `operations[]`, non solo da `state`.

## 4. Flusso operativo consigliato

### 4.1 Plugin `failed`

1. Leggi `statusReason`, `lastFailurePhase`, `lastError`.
2. Controlla `dependencies[]` per `missing`, `disabled`, `version-mismatch`.
3. Apri `GET /v1/system/plugins/:pluginId/events`.
4. Se il contesto e coerente, prova `reload` oppure `load` secondo `operations[]`.

### 4.2 Plugin `disabled`

1. Leggi `disabledReason`.
2. Verifica se il disable e stato manuale o conseguenza di un problema operativo.
3. Usa `enable`.
4. Solo dopo, se consentito, esegui `load` o `reload`.

### 4.3 Plugin con dipendenza bloccata

1. Trova la dipendenza con `status !== "ok"`.
2. Risolvi prima il plugin dipendenza.
3. Riesegui l'operazione sul plugin bloccato.

Il runtime non simula fallback impliciti: protegge il grafo reale.

## 5. Esempi HTTP

### Leggere il dettaglio di un plugin

```http
GET /v1/system/plugins/core-pack
```

### Disabilitare un plugin con motivo operatore

```http
POST /v1/system/plugins/core-pack/operations
Content-Type: application/json

{
  "operation": "disable",
  "reason": "maintenance window"
}
```

### Leggere gli eventi recenti

```http
GET /v1/system/plugins/core-pack/events
```

## 6. Esempio SDK

```ts
const plugin = await cms.system.getInstalledPlugin({
  path: { pluginId: "core-pack" }
});

if (plugin.data.operations.some((item) => item.operation === "reload" && item.available)) {
  await cms.system.executePluginOperation({
    path: { pluginId: "core-pack" },
    body: { operation: "reload" }
  });
}

const events = await cms.system.listPluginEvents({
  path: { pluginId: "core-pack" }
});
```

## 7. Troubleshooting rapido

| Sintomo               | Dove guardare                                                   | Azione consigliata                                                                |
| --------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Plugin in `failed`    | `lastFailurePhase`, `lastError`, `events`                       | verifica fase e causa, poi usa `load`/`reload` solo se `operations[]` lo consente |
| Plugin in `disabled`  | `disabledReason`, `events`                                      | usa `enable`, poi riesegui `load` se disponibile                                  |
| Dipendenza `missing`  | `dependencies[]`                                                | registra/carica prima il plugin dipendenza                                        |
| Dipendenza `disabled` | `dependencies[]`, snapshot dipendenza                           | riabilita la dipendenza prima del plugin chiamante                                |
| `version-mismatch`    | `dependencies[]`                                                | riallinea la versione richiesta o la versione installata                          |
| Operazione rifiutata  | `error.details.plugin.operations`, `error.details.recentEvents` | il runtime sta proteggendo uno stato non valido o un vincolo di dipendenza        |

## 8. Limiti dichiarati di `M3`

`M3` rende i plugin amministrabili e osservabili, ma non introduce ancora:

- provisioning da cataloghi remoti;
- upgrade orchestrati multi-plugin;
- authorization kernel-level dedicata indipendente dal resto dell'app;
- observability distribuita fuori dal processo.

Questi limiti sono intenzionali: la UI e le API dichiarano solo il supporto reale del runtime corrente.
