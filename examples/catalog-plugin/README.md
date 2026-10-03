# Catalog plugin — starter v1

Trusted plugin reference for Trinacria CMS 0.1.0 beta. Node 24.21+ and a transactional
Mongo replica set are required. Backend dependency React is optional; `/admin` needs
React 19 and the host's single React instance.

1. Run `create-trinacria-plugin ./my-catalog my-catalog` from the installed kernel.
   The destination must not exist. The generator installs and executes nothing.
2. Review `package.json`, then install dependencies and run build/typecheck/test.
3. Register `createCatalogPlugin()` explicitly after Core. The default host runs
   one CMS instance with trusted in-process plugins; cluster configuration is optional. First load of an empty namespace
   initializes schema 1; existing unversioned data requires reviewed migration.
4. Import `CATALOG_ADMIN_MANIFEST` from `my-catalog/admin-manifest` for pure metadata
   and `CATALOG_ADMIN_RENDERERS` from `my-catalog/admin` in the trusted host's
   renderer registry and rebuild the admin. The dashboard count describes this page,
   never invents a total beyond the 100-item page limit.
5. Provision the declared read/write permissions for the intended users. CRUD routes
   use authenticated user contexts and the same authorization facade as internal calls.
   Update/delete require expectedVersion; stale requests return 409.
6. `storage.transaction` creates the item and protected `item-created` outbox atomically.
   Event bodies contain ID/version only. The separate consumer declares its catalog
   dependency, subscription and permission. Install/load it without database approvals;
   its inspect operation calls the public `items.get` service directly.
7. Save the live OpenAPI explicitly, then run
   `trinacria-sdk ./openapi.json ./generated/catalog --mode overlay --owner my-catalog`. Integrate the overlay alongside the base SDK;
   replace the starter's small generic request in the UI with the generated method.
8. Disable through the standard lifecycle API and let the runtime drain active work.
   Uninstall preserves `items`; purge is a separate reviewed backup-based operation.
   For a single instance: stop the CMS, back up, run reviewed migrations with
   `cms migrations plan/apply/status`, install the upgrade and restart. Multi-instance
   deployments use the separate distributed runtime runbook and `cms plugins deploy`.

The separate catalog-consumer imports kernel contracts only. Its event handler writes
owned observations using the delivery transaction; it never escapes that transaction
with a cross-plugin call. Its explicit inspect operation calls the catalog outside
an event transaction using its declared catalog dependency, without a grant record.

Conformance: `cms-plugin-conformance --manifest manifest.json --core-version 0.1.0
--openapi openapi.json --scenario ./conformance.mjs`. A scenario explicitly exports
`tests` for each required acceptance name. The tool fails on missing scenarios or
failed assertions. Static-only invocation reports `complete:false`; this is not a
security certificate. Never run unknown scenario code in a privileged host.

Human trial: ask a team member who did not author this template to generate, install,
register, configure permissions, build the admin, perform CRUD, upgrade and remove.
Record time, errors, host rebuilds and documentation fixes in the M8 acceptance record.
No claim of a human trial is made by automated tests.

Verification in the CMS release fixture: generated package and separate consumer are
installed as physical tarballs outside the monorepo; authenticated CRUD and denials,
protected durable events without approvals, dependency-aware reload, preservation on
uninstall, typed SDK overlay and Chromium CRUD/conflict/API-down recovery are checked.
Automated tests do not replace the independent human trial or deployment acceptance.
