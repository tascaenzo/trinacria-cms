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
- `GET /v1/users`
- `GET /v1/users/:id`
- `POST /v1/users`
- `PATCH /v1/users/:id/status`
- `GET /openapi.json`
- `GET /docs` (Swagger UI)
