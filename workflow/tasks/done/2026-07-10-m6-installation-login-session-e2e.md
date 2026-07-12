# M6 Installation, Login And Session E2E

## Obiettivo

Validare dal browser il percorso setup mode, wizard, login post-bootstrap, restore e logout.

## Scope

- stato iniziale non installato con DB configurato
- wizard sito, amministratore e review
- login automatico post-bootstrap
- login esplicito, restore sessione, logout e credenziali errate
- access token bearer compatibile nel payload, refresh token solo in cookie HttpOnly

## Check

- `npm run e2e -- --grep "installation|login|session"`

## Avanzamento

- [x] stato iniziale non installato con DB configurato
- [x] wizard sito/admin/review e login automatico
- [x] access token bearer nel payload e refresh token solo in cookie HttpOnly
- [x] login esplicito da UI, credenziali errate, restore sessione e logout server-side

## Verifica completata

- `npm run e2e:ci`: installazione, login, restore e logout passati nel run completo da 14 test
