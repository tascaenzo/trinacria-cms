# M5 API, OpenAPI e SDK runtime plugin

## Obiettivo

Allineare endpoint, DTO, OpenAPI e SDK agli stati runtime e alle operazioni M5.

## Area

`kernel | sdk`

## Milestone

`M5 - Plugin Runtime Foundation`

## Scope

- In scope: `GET /v1/system/plugins`
- In scope: `GET /v1/system/plugins/{pluginId}`
- In scope: `POST /v1/system/plugins/{pluginId}/operations`
- In scope: `GET /v1/system/plugins/{pluginId}/events`
- In scope: `GET /v1/system/plugins/sources`
- In scope: DTO runtime, dependency, operations, source ed events
- In scope: OpenAPI snapshot e generated SDK
- Out of scope: endpoint install marketplace

## File impattati

- `packages/kernel/src/http/kernel-system.controller.ts`
- `packages/kernel/src/runtime/kernel-system-service.ts`
- `packages/sdk/openapi/trinacria-cms.openapi.json`
- `packages/sdk/src/generated/**`
- `packages/sdk/src/runtime/**`
- `packages/sdk/test/**`

## Check

- `npm run typecheck -w @trinacria-cms/kernel`
- `npm run test -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/kernel`
- `npm run build -w @trinacria-cms/sdk`
- `npm run test -w @trinacria-cms/sdk`
