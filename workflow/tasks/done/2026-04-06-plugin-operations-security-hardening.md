# Hardening sicurezza plugin operations e route admin plugins

## Obiettivo

Rendere admin-only in modo reale e coerente la superficie plugin operativa introdotta da `M3`, sia lato backend/API sia lato backoffice.

## Scope

- In scope: enforcement admin sulle route `kernel` plugin/system operative
- In scope: allineamento OpenAPI/SDK
- In scope: guard coerente sulla route backoffice `plugins`
- In scope: documentazione finale del modello di protezione
- Out of scope: redesign auth generale del kernel

## File o aree impattate

- `packages/kernel/src/**`
- `packages/core-pack/src/modules/auth/**`
- `packages/admin-kernel/src/**`
- `packages/sdk/**`
- `docs/cms/**`
- `workflow/**`

## Check da eseguire

- `npm run build`
- `npm test`
- `npm run lint`
