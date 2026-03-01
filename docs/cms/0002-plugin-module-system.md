# 0002 - Sistema Plugin/Module

## Obiettivo

Evitare conflitti tra estensioni e mantenere il core piccolo.

## Modello

- Un `Plugin` esporta un manifest con metadata e factory.
- La factory registra module e provider nel kernel.
- Ogni plugin ha un `PluginContext` con servizi base forniti dal core.

## Isolamento

Ogni plugin gira con:

- scope DI dedicato
- namespace settings dedicato
- prefisso eventi dedicato

Conflitti da bloccare in bootstrap:

- plugin id duplicato
- route/API collision non dichiarate
- override provider senza permesso esplicito

## Dipendenze tra plugin

- Dipendenze esplicite nel manifest (`requires`).
- Ordinamento topologico in fase di bootstrap.
- Errore hard se una dipendenza non e soddisfatta.

## Contract minimo plugin

- `id`, `version`, `requires`
- `register(ctx)`
- opzionale `boot(ctx)`
- opzionale `shutdown(ctx)`
