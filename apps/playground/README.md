# Playground API App

Local app to test the CMS kernel starter, the Trinacria bridge, and core-pack
plugin HTTP APIs against Mongo.

## Run

```bash
docker compose up -d mongo
npm run dev -w @trinacria-cms/playground
```

Default Mongo connection is aligned with `docker-compose.yml`:

`mongodb://trinacria:trinacria@127.0.0.1:27017/trinacria_cms?authSource=admin`

## Endpoints

- `GET /health`
- `GET /health/dependencies`
- `GET /ready`
- `GET /metrics`
- `GET /ops/checklist`
- `GET /v1/users`
- `GET /v1/users/:id`
- `POST /v1/users`
- `PATCH /v1/users/:id/status`
- `GET /openapi.json`
- `GET /docs` (Swagger UI)

## Production security profile

Set `NODE_ENV=production` or `NODE_ENV=staging` to enable the hardened profile:

- `HTTP_CORS_ORIGINS` is mandatory and wildcard CORS is rejected
- `securityHeaders`, `rateLimit`, `requestTimeout`, and cookie CSRF origin checks are enabled
- `CMS_OPENAPI_ENABLED=false` and `CMS_SWAGGER_ENABLED=false` by default
- `CMS_JWT_SECRET` is required, must not use placeholder values, and should be injected at runtime
- `CMS_JWT_SECRET_FILE` can point to a mounted secret file when using Docker/Kubernetes

Typical production values:

```bash
NODE_ENV=production
HTTP_CORS_ORIGINS=https://admin.example.com
CMS_CSRF_TRUSTED_ORIGINS=https://admin.example.com
CMS_JWT_SECRET_FILE=/run/secrets/cms_jwt_secret
CMS_OPENAPI_ENABLED=false
CMS_SWAGGER_ENABLED=false
LOG_FORMAT=json
OBSERVABILITY_TOKEN=replace-with-runtime-secret
```

## Observability

The app emits structured JSON logs by default and records in-process HTTP
metrics. Use:

- `/ready` for readiness probes
- `/metrics` for counters and recent request errors
- `/ops/checklist` for the release/runbook checklist covering health, DB,
  plugin runtime, auth, backoffice, login, and settings

Set `OBSERVABILITY_TOKEN` to protect `/metrics` and `/ops/checklist` with a
Bearer token.
