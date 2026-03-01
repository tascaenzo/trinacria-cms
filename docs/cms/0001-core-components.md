# 0001 - Componenti Core

## Componenti principali

1. `Kernel`

- Avvio/stop runtime.
- Registry di module e plugin.
- Gestione lifecycle (`boot`, `shutdown`).

2. `Container` (DI)

- Risoluzione provider.
- Scope globale + scope plugin.
- Override controllato dei token.

3. `Module Registry`

- Elenco module attivi.
- Metadata (versione, dipendenze, capabilities).
- Rilevazione conflitti.

4. `Provider System`

- Contratti servizi base (`logger`, `config`, `db`, `events`, `auth`).
- Provider di core sostituibili con custom provider.

5. `Permission/RBAC Contract`

- Ruoli, permessi, policy hook.
- Enforcement centralizzato a livello API.

6. `Settings Contract`

- Config sistema per namespace.
- Supporto a setting globali + setting per plugin.

## Boundary del core

Dentro il core:

- lifecycle runtime
- registry e contratti
- DI
- primitive cross-cutting (auth contract, rbac contract, settings contract)

Fuori dal core (plugin/module):

- content types
- media
- auth strategy specifiche
- workflow editoriali
