# Production Deploy And Security Hardening Docs

## Obiettivo

Documentare deploy production e hardening security mirato per il passaggio verso M6.

## Area

`docs | infra | security`

## Milestone

`M6`

## Scope

- In scope:
  - `.env` richiesti per production
  - Mongo runtime, backup e restore
  - reverse proxy
  - CORS/CSRF
  - JWT secret
  - observability token
  - checklist su eventi sensibili, replay, permission escalation, CSRF e secret leakage
- Out of scope:
  - E2E browser
  - automazione backup provider-specific
  - hardening infrastrutturale cloud-specific

## File impattati

- `README.md`
- `docs/cms/it/README.md`
- `docs/cms/it/0020-runbook-deploy-production.md`
- `docs/cms/it/0021-checklist-hardening-security.md`

## Check

- Review documentale dei riferimenti e dei link.

