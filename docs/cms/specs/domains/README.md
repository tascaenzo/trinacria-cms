# Specifiche dei plugin dominio

Questa directory raccoglie le specifiche implementabili dei plugin che vivono
sopra `kernel` e `core-pack`. Non modifica i contratti core: ogni documento
deve dichiarare dipendenze, ownership, API e confini con gli altri plugin.

| File | Plugin | Stato |
| --- | --- | --- |
| [editorial-pack.md](./editorial-pack.md) | Motore di contenuti strutturati, workflow e tassonomie | `functional-spec-v1` |
| [identity-access.md](./identity-access.md) | Identità, accessi e recupero locale | `implemented-beta` |
| [media-pack.md](./media-pack.md) | Asset, storage provider, directory e access control | `implemented-v0` |

La revisione dei percorsi effettivi parte da Core/IAM e prosegue con i pack dominio:
[audit funzionale, correzioni e decisioni](./functional-audit.md).
Il report distingue percorsi verificati, decisioni implementate, limiti delle
prove e capacità future.
