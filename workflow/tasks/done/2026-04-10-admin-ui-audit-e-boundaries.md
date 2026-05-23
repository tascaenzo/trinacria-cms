# Audit `admin-ui` e confini con `admin-kernel`

## Obiettivo

Definire con precisione cosa deve vivere in `packages/trinacria-ui` e cosa deve restare in `packages/admin-kernel`, evitando che il backoffice continui a crescere con pattern UI duplicati o non riusabili.

## Scope

- In scope: audit dei componenti esistenti in `admin-ui`
- In scope: audit dei pattern duplicati o candidabili in `admin-kernel`
- In scope: criteri di ownership tra package
- Out of scope: implementazione completa dei componenti nuovi

## File o aree impattate

- `packages/trinacria-ui/src/**`
- `packages/admin-kernel/src/**`
- `workflow/**`
- documentazione tecnica correlata

## Check da eseguire

- review manuale di `packages/trinacria-ui/src/**`
- review manuale di `packages/admin-kernel/src/**`
