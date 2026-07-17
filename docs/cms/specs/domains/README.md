# Specifiche dei plugin dominio

Questa directory raccoglie le specifiche implementabili dei plugin che vivono
sopra `kernel` e `core-pack`. Non modifica i contratti core: ogni documento
deve dichiarare dipendenze, ownership, API e confini con gli altri plugin.

| File | Plugin | Stato |
| --- | --- | --- |
| [editorial-pack.md](./editorial-pack.md) | Motore di contenuti strutturati, workflow e tassonomie | `functional-spec-v1` |
| [media-pack.md](./media-pack.md) | Asset, storage provider, directory e access control | `implemented-v0` |
