# Trinacria CMS Documentation

Questa e la casa unica della documentazione di Trinacria CMS.

La documentazione del framework base resta separata in `docs/trinacria` e non va
mescolata con le decisioni del CMS.

## Struttura

- `architecture/`: direzione architetturale, filosofia e decisioni di prodotto
  tecnico.
- `specs/core-platform/`: specifiche implementabili della piattaforma core
  plugin-first.
- `it/`: manuale didattico e operativo in italiano.
- `en/`: manuale didattico e operativo in inglese.
- `GLOSSARY.md`: terminologia canonica.

## Stato corrente e guide operative

- [Stato e qualità del progetto](../project-quality-status.md): funzionalità presenti, verifiche e limiti.
- [Design system e Tailwind](../trinacria-ui-design-system.md): API UI e regole di adozione.
- [Audit backoffice](../backoffice-ui-audit.md): interventi conclusi e copertura da estendere.
- [Operazioni editoriali](it/0023-editorial-operazioni.md): modelli, workflow, restore e permessi.
- [Dipendenze verificate](../dependency-audit-2026-10-01.md): versioni e risultati registrati.
- [Checklist piattaforma plugin](architecture/plugin-platform-operational-checklist.md): gap verificati, priorità e criteri per la beta sviluppatori.
- [Piano tecnico piattaforma plugin](architecture/plugin-platform-implementation-plan.md): decisioni completate, contratti, migrazioni, gate e task per lo sviluppo.

Le specifiche e i piani storici descrivono anche obiettivi futuri; lo stato corrente prevale
quando si deve stabilire quali funzionalità sono effettivamente disponibili.

## Fonti di verita

- Direzione CMS: [architecture/plugin-first-cms-direction.md](architecture/plugin-first-cms-direction.md)
- Mappa package: [architecture/package-map.md](architecture/package-map.md)
- Specifiche core M4.0: [specs/core-platform/README.md](specs/core-platform/README.md)
- Guida implementativa M5: [specs/core-platform/m5-plugin-runtime-implementation.md](specs/core-platform/m5-plugin-runtime-implementation.md)
- Glossario: [GLOSSARY.md](GLOSSARY.md)

## Regola

Le decisioni su Trinacria CMS devono vivere sotto `docs/cms`.

`docs/trinacria` resta il riferimento del framework Trinacria e non deve essere
modificato per decisioni specifiche del CMS.

- [Vault A2: keyring, claim e rotazione](architecture/plugin-platform/secure-payload-keyring-runbook.md).

- [Operazioni applicative A3: inventario e permessi](architecture/plugin-platform/application-operation-inventory.md).
