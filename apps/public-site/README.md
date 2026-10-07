# Public site

Reference editorial site with React SSR, Vite hydration, public SDK delivery and
scoped previews. Build from the repository root, configure server-only environment,
then run `npm run start -w @trinacria-cms/public-site`.

Configure PUBLIC_SITE_ORIGIN, PUBLIC_SITE_API_BASE_URL, PUBLIC_SITE_ID and
PUBLIC_SITE_BACKOFFICE_ORIGINS_JSON. Production origins require HTTPS. Use a distinct
hostname from the backoffice and never share admin cookies with the site. TLS can be
terminated by a trusted reverse proxy or configured with certificate/key file paths.

Models are private by default. Enable delivery and explicitly allow public fields
in the backoffice. Working changes appear in preview until explicitly republished.
Preview tokens are posted in form bodies, exchanged server-side, and represented by
an HttpOnly/Secure/Lax session cookie; no admin JWT is sent to this app's client.

`/health` is process liveness; `/ready` checks the CMS. SSR failures are controlled
503 pages. JSON responses are bounded to 1 MiB and proxied media to 16 MiB. The app
renders only React block components and escaped SSR data under a nonce CSP.

See [the operational runbook](../../docs/cms/architecture/plugin-platform/public-site-runbook.md)
for publication, previews, cache, navigation, deployment and verification.
