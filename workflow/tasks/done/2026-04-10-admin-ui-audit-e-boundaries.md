# Audit `admin-ui` e confini con `admin-kernel`

## Meta

- ID: `task-admin-ui-audit-boundaries`
- Stato: `in-progress`
- Area: `backoffice`
- Milestone: `M3.5`
- Owner: `enzo`
- Creato il: `2026-04-10`
- Ultimo aggiornamento: `2026-04-10`

## Obiettivo

Definire con precisione cosa deve vivere in `packages/trinacria-ui` e cosa deve restare in `packages/admin-kernel`, evitando che il backoffice continui a crescere con pattern UI duplicati o non riusabili.

## Contesto

Il progetto possiede gia `packages/trinacria-ui`, ma non e ancora trattato come design system completo. Prima di aggiungere Storybook e nuovi componenti, bisogna fissare i confini tra libreria UI e runtime admin.

## Scope

- In scope: audit dei componenti esistenti in `admin-ui`
- In scope: audit dei pattern duplicati o candidabili in `admin-kernel`
- In scope: criteri di ownership tra package
- Out of scope: implementazione completa dei componenti nuovi

## Deliverable

- inventario componenti esistenti
- lista pattern da promuovere in `admin-ui`
- regole di confine `admin-ui` vs `admin-kernel`

## File o aree impattate

- `packages/trinacria-ui/src/**`
- `packages/admin-kernel/src/**`
- `workflow/**`
- documentazione tecnica correlata

## Dipendenze

- nessuna oltre alla baseline `M3`

## Check da eseguire

- review manuale di `packages/trinacria-ui/src/**`
- review manuale di `packages/admin-kernel/src/**`

## Note operative

Audit eseguito sui package:

- `packages/trinacria-ui/src/index.ts` esporta oggi solo primitive e shell:
  - primitive: `Button`, `Badge`, `Card`, `Dialog`, `Field`, `Input`, `Select`, `Textarea`, `JsonView`, `Icon`
  - layout shell: `AdminShell`
- `packages/admin-kernel/src/components` contiene gia pattern riusabili che oggi non vivono nel design system:
  - `mobile-records.tsx`: lista/card mobile per risorse amministrative
  - `resource-feedback.tsx`: `ErrorBanner` e `EmptyState`
  - `auth-screen-layout.tsx`: layout dedicato ad auth/bootstrap, al momento troppo specifico per essere promosso senza rifinitura

Classificazione decisa:

- `admin-ui` deve possedere:
  - fondazioni visuali e token condivisi del backoffice
  - componenti atomici e composti privi di logica dominio
  - pattern riusabili di presentazione per liste, stati vuoti, errori, page sections, toolbar, filtri e shell
- `admin-kernel` deve possedere:
  - routing, capability guards, runtime plugin-aware, i18n e wiring applicativo
  - pagine business-oriented (`users`, `plugins`, `settings`, ecc.)
  - flussi che dipendono da contratti kernel o da capability del dominio

Decisione sui candidati immediati:

- Promuovere in `admin-ui` nel task successivo:
  - `resource-feedback.tsx` come feedback/state primitives del backoffice
  - `mobile-records.tsx` come pattern composto per viste responsive di risorse
- Lasciare in `admin-kernel` per ora:
  - `auth-screen-layout.tsx`, finche non esiste una variante chiaramente generalizzata e documentata

Criteri di confine da applicare da ora in poi:

- se un componente accetta solo props presentazionali e non importa contratti kernel, deve stare in `admin-ui`
- se un componente conosce capability, API client, routing admin o dominio applicativo, resta in `admin-kernel`
- `admin-ui` non deve dipendere da `admin-kernel`
- `admin-kernel` puo dipendere da `admin-ui` e comporre i pattern con logica runtime

## Chiusura

- Changelog aggiornato: `no`
- Documentazione aggiornata: `no`
- Follow-up aperti:
  - avviare `2026-04-10-admin-ui-foundations-and-tokens.md`
  - pianificare l'estrazione di `resource-feedback` e `mobile-records` in `admin-ui`
