# Proposta: modernizzazione della toolchain con Biome e Turborepo

> Stato: proposta tecnica da valutare. Il documento non rappresenta una decisione definitiva.

## Contesto

Il repository utilizza un monorepo con più workspace e una toolchain basata su script npm, TypeScript, strumenti di linting/formattazione tradizionali e orchestrazione manuale dei task.

Con la crescita del numero di package e plugin, questa impostazione può portare a:

- script root sempre più lunghi;
- ordine di build mantenuto manualmente;
- ricompilazioni non necessarie;
- lint e formattazione non uniformi tra workspace;
- dipendenze di sviluppo ridondanti;
- maggiore difficoltà nell'eseguire controlli solo sui package interessati da una modifica.

La proposta consiste nell'introdurre:

- **Biome** per linting e formattazione;
- **Turborepo** per orchestrazione, task graph e caching del monorepo.

Questa proposta non include l'adozione di Turbopack. Turbopack è un bundler, mentre il problema qui affrontato riguarda soprattutto qualità del codice e orchestrazione dei task del monorepo.

## Obiettivi

- sostituire strumenti legacy di linting e formattazione con una soluzione unica e veloce;
- rendere uniforme la qualità del codice in tutti i workspace;
- eliminare gli script root che costruiscono manualmente i package in sequenza;
- sfruttare il grafo delle dipendenze già dichiarato nei `package.json`;
- eseguire in parallelo i task indipendenti;
- evitare di rieseguire task quando input e dipendenze non sono cambiati;
- mantenere ogni workspace autonomamente eseguibile;
- limitare il numero complessivo di dipendenze di sviluppo.

## Principi della proposta

1. Biome sostituisce linting e formattazione, non TypeScript.
2. Turborepo orchestra gli script esistenti, non contiene logica applicativa o di build specifica dei package.
3. Ogni workspace deve continuare a poter essere compilato, testato e controllato singolarmente.
4. La migrazione deve essere progressiva e verificabile.
5. Non devono essere introdotte contemporaneamente modifiche non necessarie a runtime, package manager o bundler.
6. La configurazione iniziale deve restare minima.

---

# Parte 1 — Biome

## Ruolo

Biome viene proposto come strumento unico per:

- linting JavaScript e TypeScript;
- linting JSX e TSX;
- formattazione;
- organizzazione degli import;
- correzioni automatiche;
- controlli coerenti in locale e CI.

L'obiettivo è sostituire, dove presenti o previsti:

```text
ESLint
Prettier
plugin ESLint generici
plugin per import sorting
script di formattazione separati
```

Biome non sostituisce:

```text
tsc
TypeScript type checking
test runner
bundler
```

## Configurazione centrale

La configurazione principale dovrebbe vivere nella root del repository:

```text
biome.json
```

Esempio indicativo:

```json
{
  "$schema": "https://biomejs.dev/schemas/latest/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double"
    }
  }
}
```

La configurazione definitiva deve riflettere lo stile già utilizzato dal repository, evitando un grande diff puramente estetico durante la migrazione.

## Script root proposti

```json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "check": "biome check .",
    "check:write": "biome check --write ."
  }
}
```

## Script dei workspace

Ogni workspace dovrebbe esporre almeno:

```json
{
  "scripts": {
    "lint": "biome check ."
  }
}
```

In alternativa, per evitare ripetizioni, il lint può essere eseguito dalla root tramite Turborepo soltanto nei workspace che dichiarano lo script.

## Regole specializzate

Prima di rimuovere definitivamente ESLint, va verificato se il repository utilizza o prevede regole non ancora coperte da Biome, per esempio:

- regole architetturali tra package;
- regole specifiche NestJS;
- regole React molto specializzate;
- restrizioni personalizzate sugli import;
- regole interne del progetto.

Le regole architetturali non devono necessariamente essere implementate nel linter. Possono essere gestite anche tramite:

- test dedicati;
- script di verifica del grafo delle dipendenze;
- package export rigorosi;
- dependency constraints;
- controlli CI mirati.

Non si propone di mantenere ESLint in parallelo senza un caso concreto che lo giustifichi.

## Migrazione Biome

### Fase B1 — inventario

- identificare configurazioni ESLint e Prettier esistenti;
- identificare plugin e regole realmente utilizzati;
- individuare file attualmente esclusi;
- verificare eventuali conflitti con file generati.

### Fase B2 — introduzione

- aggiungere Biome come dipendenza di sviluppo root;
- creare `biome.json`;
- eseguire il lint senza modifiche automatiche;
- correggere soltanto errori reali e configurazione incompatibile.

### Fase B3 — formattazione controllata

- applicare la formattazione in un commit separato;
- evitare di mescolare il reformat con modifiche funzionali;
- escludere artefatti generati, build output e snapshot quando necessario.

### Fase B4 — rimozione legacy

- rimuovere ESLint, Prettier e plugin non più necessari;
- sostituire gli script placeholder dei workspace;
- aggiornare CI e documentazione di sviluppo;
- aggiungere un controllo che impedisca divergenze di formattazione.

---

# Parte 2 — Turborepo

## Ruolo

Turborepo viene proposto come orchestratore dei task del monorepo.

Non sostituisce:

```text
npm workspaces
TypeScript
Vite
Node test runner
Biome
script specifici dei package
```

Turborepo utilizza gli script già presenti nei workspace e costruisce un grafo in base alle dipendenze dichiarate nei rispettivi `package.json`.

## Problema attuale da risolvere

Una build root mantenuta manualmente tende ad assumere forme simili a:

```json
{
  "scripts": {
    "build": "npm run build -w kernel && npm run build -w core-pack && npm run build -w sdk && npm run build -w editorial-pack"
  }
}
```

Questo approccio presenta limiti:

- l'ordine deve essere aggiornato manualmente;
- task indipendenti non vengono parallelizzati;
- i package vengono spesso ricostruiti anche senza modifiche;
- i `prebuild` possono iniziare a ricompilare dipendenze arbitrarie;
- la CI non distingue facilmente i package interessati.

## Configurazione iniziale proposta

File root:

```text
turbo.json
```

Configurazione iniziale indicativa:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Questa configurazione deve essere adattata ai task reali del repository. In particolare, non tutti i test devono necessariamente dipendere da `build` se possono essere eseguiti direttamente sui sorgenti.

## Script root proposti

```json
{
  "scripts": {
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "check": "turbo run lint typecheck test",
    "dev": "turbo run dev"
  }
}
```

## Autonomia dei workspace

Ogni package deve mantenere script propri e funzionanti:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "biome check .",
    "test": "node --import tsx --test test/**/*.test.ts"
  }
}
```

Deve continuare a essere possibile eseguire:

```bash
npm run build -w @trinacria-cms/editorial-pack
npm run typecheck -w @trinacria-cms/kernel
npm run test -w @trinacria-cms/sdk
```

Turborepo non deve diventare un requisito per comprendere o testare un singolo workspace.

## Task graph

La relazione:

```json
{
  "dependsOn": ["^build"]
}
```

indica che la build delle dipendenze del workspace deve essere completata prima della build del workspace stesso.

Esempio:

```text
kernel ─────────┐
core-pack ──────┼──→ editorial-pack
sdk ────────────┘
```

Le build indipendenti possono essere eseguite in parallelo.

## Cache

Per i task deterministici, Turborepo può evitare esecuzioni ripetute quando gli input non sono cambiati.

Task inizialmente cacheabili:

```text
build
typecheck
lint
unit test deterministici
SDK generation deterministica
```

Task da non mettere in cache:

```text
dev
deploy
migrazioni
seed
publish
operazioni su database
operazioni su servizi esterni
```

## Output

I task che generano file devono dichiarare gli output:

```json
{
  "build": {
    "outputs": ["dist/**"]
  }
}
```

Per package che producono output differenti potrebbero servire override specifici, per esempio:

```text
apps/backoffice/dist/**
packages/sdk/src/generated/**
coverage/**
```

## Variabili d'ambiente

I task che dipendono da variabili d'ambiente devono dichiararle nella configurazione, in modo che la cache venga invalidata correttamente.

Esempio:

```json
{
  "build": {
    "env": ["NODE_ENV", "PUBLIC_API_URL"],
    "outputs": ["dist/**"]
  }
}
```

Non devono essere aggiunte variabili in modo indiscriminato. Ogni variabile dichiarata aumenta le invalidazioni della cache.

## Generazione SDK

Il package SDK contiene già una pipeline di generazione a partire dallo snapshot OpenAPI.

In una prima fase si propone di mantenerla nel suo script `build`:

```json
{
  "scripts": {
    "build": "npm run generate && tsc -p tsconfig.json"
  }
}
```

Turborepo orchestra il task senza introdurre una nuova scomposizione.

Solo se la generazione diventa costosa o viene riutilizzata separatamente, si potrà introdurre un task dedicato:

```text
generate
build
check:generated
```

## Filtri

Turborepo consente di eseguire task su singoli package o insiemi correlati.

Esempi indicativi:

```bash
turbo run build --filter=@trinacria-cms/editorial-pack
```

```bash
turbo run build --filter=@trinacria-cms/editorial-pack...
```

```bash
turbo run test --filter=...[origin/main]
```

Questi filtri possono essere introdotti successivamente nella CI, dopo aver verificato la correttezza del grafo.

---

# Architettura risultante

```text
npm workspaces
    ↓ gestione dei package

Biome
    ↓ lint, format, import organization

TypeScript
    ↓ build e type checking

Node/Vite
    ↓ test e frontend tooling

Turborepo
    ↓ orchestrazione, task graph, parallelismo, cache
```

La proposta non richiede di cambiare:

- Node.js;
- npm workspaces;
- TypeScript;
- Vite;
- test runner backend;
- struttura dei package;
- runtime applicativo.

---

# Modifiche candidate

## P0 — preparazione

- [ ] Inventariare ESLint, Prettier, plugin e configurazioni esistenti.
- [ ] Inventariare gli script root e i `prebuild` che compilano altri workspace.
- [ ] Verificare che ogni workspace esponga script locali coerenti.
- [ ] Identificare output reali di build, test e code generation.
- [ ] Identificare file generati da escludere dal formatter.

## P1 — Biome

- [ ] Aggiungere Biome nella root.
- [ ] Creare una configurazione compatibile con lo stile esistente.
- [ ] Sostituire gli script lint placeholder.
- [ ] Applicare il reformat in un commit isolato.
- [ ] Aggiornare CI ed editor configuration.
- [ ] Rimuovere dipendenze legacy non più necessarie.

## P1 — Turborepo

- [ ] Aggiungere Turborepo nella root.
- [ ] Creare `turbo.json` con `build`, `typecheck`, `lint`, `test` e `dev`.
- [ ] Sostituire la sequenza manuale degli script root.
- [ ] Rimuovere `prebuild` e `pretypecheck` che ricompilano dipendenze esplicitamente.
- [ ] Dichiarare correttamente gli output dei task.
- [ ] Verificare cache hit e invalidazione su modifiche alle dipendenze.

## P2 — ottimizzazione

- [ ] Introdurre filtri affected-only in CI.
- [ ] Valutare cache remota solo dopo aver stabilizzato quella locale.
- [ ] Valutare task separati per code generation costosa.
- [ ] Aggiungere controlli sul grafo delle dipendenze tra workspace.
- [ ] Misurare tempi di build, typecheck, lint e test prima e dopo la migrazione.

---

# Criteri di accettazione

La proposta può essere considerata riuscita quando:

1. ogni workspace mantiene script autonomi funzionanti;
2. il lint non contiene più placeholder;
3. formattazione e lint usano un'unica configurazione root;
4. gli script root non contengono più sequenze manuali dei workspace;
5. il task graph rispetta le dipendenze reali del monorepo;
6. una seconda esecuzione senza modifiche produce cache hit sui task deterministici;
7. la modifica a un package invalida correttamente i suoi task e quelli dei dipendenti;
8. la CI continua a verificare SDK generato, typecheck, lint e test;
9. il numero complessivo di dipendenze di sviluppo diminuisce o resta controllato;
10. non vengono introdotte modifiche al comportamento runtime del CMS.

# Rischi

## Copertura lint incompleta

Biome potrebbe non coprire alcune regole ESLint specializzate.

Mitigazione:

- inventario prima della rimozione;
- mantenere soltanto controlli realmente necessari;
- spostare le regole architetturali in test o script dedicati quando più appropriato.

## Grande diff di formattazione

Una migrazione può produrre modifiche su molti file.

Mitigazione:

- commit separato;
- nessuna modifica funzionale nello stesso commit;
- configurazione iniziale vicina allo stile corrente.

## Cache errata

Output o variabili d'ambiente dichiarati male possono produrre cache incoerente.

Mitigazione:

- partire con pochi task;
- testare modifiche alle dipendenze;
- disabilitare la cache per task non deterministici;
- introdurre la cache remota solo successivamente.

## Eccessiva centralizzazione

Gli sviluppatori potrebbero spostare logica specifica dei package nella configurazione root.

Mitigazione:

- gli script dei workspace restano la fonte di verità;
- Turborepo orchestra, non implementa i task;
- ogni workspace deve restare eseguibile singolarmente.

# Cosa non introduce questa proposta

- migrazione a pnpm;
- migrazione a Bun;
- sostituzione di TypeScript;
- sostituzione di Vite;
- adozione di Turbopack;
- adozione di Nx;
- cache remota obbligatoria;
- nuovi framework di test;
- bundling dei package backend non necessario.

# Decisione

Nessuna decisione presa al momento.

La proposta raccomanda una sperimentazione progressiva:

1. introdurre Biome e validare la copertura;
2. introdurre Turborepo con un task graph minimo;
3. misurare tempi, semplicità degli script e comportamento della cache;
4. rimuovere gli strumenti legacy soltanto dopo la verifica completa.
