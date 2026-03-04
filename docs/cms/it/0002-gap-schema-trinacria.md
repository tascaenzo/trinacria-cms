# 0002 - Gap di `@trinacria/schema` da colmare in libreria

## Obiettivo

Documentare le mancanze emerse durante l'implementazione del validator manifest plugin nel CMS, per spostare i miglioramenti direttamente in `@trinacria/schema` (upstream).

## Contesto

Nel core CMS abbiamo validato `PluginManifest` con:

- id plugin (`id`)
- versione plugin (`version`)
- range compatibilita core (`requiresCore`)
- capability list
- dependency list (`pluginId`, `versionRange`, `optional`)

Libreria attuale `@trinacria/schema` copre bene validazioni primitive/generiche (string/number/object/array/refine), ma per casi "platform contract" emergono gap che obbligano logica extra nel consumer.

## Gap principali (priorita alta)

### 1) Assenza validator built-in per SemVer

Problema:

- oggi bisogna implementare localmente parser/validator semver.
- ogni progetto replica logica e rischia divergenze.

Miglioria proposta:

- aggiungere opzioni native su `s.string(...)`:
  - `semver?: boolean`
  - `semverRange?: boolean | { allowOr?: boolean }`

Valore:

- elimina codice duplicato nei consumer;
- standardizza compatibilita package/plugin.

### 2) Assenza validator built-in per pattern "plugin id"

Problema:

- il pattern `^[a-z0-9][a-z0-9-._/]*$` viene ripetuto nei consumer.
- mancano helper semantici per identificatori namespaced.

Miglioria proposta:

- aggiungere helper dedicati:
  - `s.pluginId()` oppure
  - `s.string({ pluginId: true })`

Valore:

- riduce boilerplate;
- rende i contratti plugin piu consistenti.

### 3) `refine` senza path contestuale

Problema:

- nelle validazioni cross-field (es. self-dependency) l'errore cade sul path root.
- non si puo puntare con precisione a `dependencies[i].pluginId` in modo nativo.

Miglioria proposta:

- introdurre variante context-aware:
  - `superRefine((value, ctx) => ctx.addIssue({ path, message, code }))`

Valore:

- errori piu leggibili e action-oriented;
- migliore UX lato API e tooling.

### 4) Mancanza modalita "collect all errors"

Problema:

- parser attuale tende a fermarsi al primo errore incontrato.
- per payload complessi e meno utile in fase di integrazione/debug.

Miglioria proposta:

- supportare strategia configurabile:
  - default: fail-fast (attuale)
  - opzionale: collect-all (`safeParse(input, { mode: "all" })`)

Valore:

- feedback completo in una sola risposta;
- migliore esperienza developer e validazione configurazioni.

## Gap secondari (priorita media)

### 5) Errori di validazione piu strutturati

Problema:

- i codici errore interni sono presenti ma non sempre uniformi/estendibili.

Miglioria proposta:

- introdurre tassonomia codici stabile e documentata;
- consentire override del codice messaggio per validator built-in.

### 6) Estensibilita validator custom riusabili

Problema:

- oggi i custom check sono spesso inline via `.refine(...)`.

Miglioria proposta:

- API plugin/registry validator:
  - `registerStringValidator(name, fn)`
  - utilizzo in `s.string({ custom: { name: "..." } })`

Valore:

- riuso cross-progetto;
- riduzione duplicazione di refine inline.

## Proposta roadmap upstream (`@trinacria/schema`)

1. v0.x+1

- `semver` + `semverRange` built-in
- `superRefine` con `ctx.addIssue`

2. v0.x+2

- collect-all mode
- helper `pluginId` (o set validator namespaced IDs)

3. v0.x+3

- registry validator custom
- miglioramenti taxonomy error code/documentazione

## Criteri di accettazione minimi

- `s.string({ semver: true })` valida versioni semver standard.
- `s.string({ semverRange: true })` valida range comuni (`^`, `~`, `>=`, `<=`, `>`, `<`, `*`, gruppi `||`).
- `superRefine` permette issue con path custom.
- `safeParse` supporta modalita collect-all opzionale.
- documentazione ufficiale aggiornata con esempi reali plugin manifest.

## Impatto sul CMS

Se i gap vengono risolti upstream:

- il core CMS elimina logica locale duplicata (es. parser semver range custom);
- i contratti plugin restano piu semplici;
- minor costo manutenzione nel tempo.
