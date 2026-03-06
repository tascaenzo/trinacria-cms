# @trinacria-cms/web

Minimal browser playground for the generated Trinacria CMS SDK.

## Purpose

- validates that `@trinacria-cms/sdk` works in a browser without React/Vite
- tests JWT and cookie auth flows through a local reverse proxy
- gives the monorepo a concrete frontend consumption example
- demonstrates the generated client groups (`auth`, `users`, `roles`, `settings`, `kernelHealth`, `system`)
- provides a simple base for testing runtime discovery against a real browser client

## Run

Start the CMS playground first, then:

```bash
npm run dev -w @trinacria-cms/web
```

The web app is served on [http://127.0.0.1:4173](http://127.0.0.1:4173) by default and proxies API calls to `http://127.0.0.1:3000`.

## Internal structure

- `src/server.ts`: static server + `/cms/*` reverse proxy + `/sdk/*` asset bridge
- `public/index.html`: import map + demo layout
- `public/app.js`: SDK client wiring and demo actions
- `public/styles.css`: standalone visual system for the browser demo

## Environment

- `CMS_WEB_HOST`: host for the demo server
- `CMS_WEB_PORT`: port for the demo server
- `CMS_WEB_API_URL`: upstream CMS API base URL
