# Configuration Registry e secrets core

## Stato

- Milestone: `M4.0 - Core Platform Specifications`
- Stato: `draft`
- Scope: funzionale
- Ultimo aggiornamento: `2026-05-20`

## Decisione

La collection `settings` e il configuration registry sicuro della piattaforma.

Non e solo storage di preferenze. E un registro centralizzato Mongo-first per
configurazioni core, configurazioni plugin e secret, con ownership, visibilita,
validazione, masking, accesso signed e audit.

## Modello concettuale

Ogni voce di configurazione ha:

- `ownerPluginId`: plugin proprietario, oppure `core-pack` per la baseline
- `namespace`: area logica gerarchica
- `key`: identificatore locale dentro il namespace
- `canonicalKey`: identificatore globale stabile
- `visibility`: `public`, `protected`, `secret`
- `schema`: forma e validazione del valore
- `value`: valore non secret o ciphertext secret
- `metadata`: versioni, audit, rotazione, sorgente, descrizione operativa

## Classi di visibilita

| Visibilita  | Lettura valore       | Uso previsto                                      |
| ----------- | -------------------- | ------------------------------------------------- |
| `public`    | core, admin, plugin  | site name, locale, feature flag non sensibili     |
| `protected` | soggetti autorizzati | config condivisa tra plugin, limiti, integrazioni |
| `secret`    | solo owner/policy    | API key, webhook secret, OAuth secret, token      |

Il backoffice puo mostrare stato, metadata, valore mascherato e azioni operative.
Non diventa owner implicito dei secret.

## Ownership e accesso

Regole:

1. Solo l'owner puo scrivere una voce salvo delega esplicita.
2. Solo l'owner o una policy esplicita puo fare reveal di un secret.
3. Un plugin non puo leggere configurazioni `protected` o `secret` di altri
   plugin senza capability/policy.
4. Le chiamate plugin-to-core per reveal o scrittura sensibile devono essere
   signed.
5. Ogni reveal, write, rotation e failed access genera audit.

## Namespace e chiavi

Le chiavi devono essere namespaced:

```text
<ownerPluginId>.<namespace>.<key>
```

Esempi:

```text
core-pack.site.locale
core-pack.security.sessionTtl
commerce.payments.stripeSecret
domain-plugin.integration.webhookUrl
```

I namespace `core`, `system`, `kernel`, `admin` e `trinacria` sono reserved.

## Secret lifecycle

Un secret supporta:

- create
- masked read
- reveal signed
- rotate
- revoke
- export mascherato
- audit trail

Il valore in chiaro non deve essere persistito. La collection conserva ciphertext,
metadata di encryption e versione chiave.

## Out of scope

- UI completa di editing settings plugin
- KMS/Vault provider obbligatorio nella prima implementazione
- sincronizzazione multi-istanza avanzata
- gestione tenant avanzata
