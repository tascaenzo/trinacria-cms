# 0000 - Visione Prodotto

## Obiettivo

Costruire un CMS headless moderno basato su Trinacria con:

- core minimale e stabile
- estendibilita via plugin installabili
- API first + SDK TypeScript
- dashboard admin React come implementazione ufficiale
- liberta totale sul frontend consumer

## Posizionamento

Prodotto ibrido tra:

- esperienza `plug and play` (core-pack pronto)
- piattaforma per developer (estensioni, custom domain logic, SDK)

## Principi architetturali

- `Core minimal`: nel kernel solo contratti, lifecycle, DI, registry.
- `Everything as module`: ogni feature e un modulo registrabile.
- `Isolation by scope`: ogni plugin lavora in uno scope DI separato.
- `API contract first`: API e SDK derivano dallo stesso contratto.
- `Low dependency`: ridurre dipendenze esterne non critiche.
