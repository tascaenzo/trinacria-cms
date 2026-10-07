# Distribution verification

Run with Node/npm from `.nvmrc` and the root manifest:

```sh
npm run release:pack
npm run release:test
```

`release:pack` builds then creates eight MIT tarballs in topological order. It checks
coordinated versions, exact internal dependencies, exported files, binaries and package
contents. `.tmp/release/release.json` records SHA-256, npm integrity and the complete
file inventory. Compiled files without a matching TypeScript source fail packaging;
archive/remove stale package `dist` outputs and rebuild before retrying.
It never publishes packages. Version 0.1.0 is currently an internal
fixture version; choose/fix the coordinated first beta version at G2 before publication.

`release:test` starts an isolated localhost registry for only `@trinacria-cms` artifacts.
Other declared dependencies resolve from the configured npm registry. It installs two
fresh projects outside this checkout with scripts disabled and no workspace symlinks:
backend without React, then admin with exactly one physical React copy. It cold-starts
all four official plugins on Mongo, typechecks public imports, builds a Vite admin from
public subpaths and opens the installation screen in Chromium. Trusted plugin renderers
are explicit host imports; upgrading renderer code requires rebuilding the admin host.
Readiness markers are matched after stripping terminal control sequences, so colored
Vite output on CI is recognized; timeout diagnostics keep the original child logs.

Mongo must be a replica set. `TRINACRIA_EXTERNAL_MONGO_URI` selects the test cluster;
the script always substitutes a fresh `trinacria_external_host_<random>_e2e` database
and removes only that database when the fixture exits. The parent waits for child
process exit, repeats cleanup explicitly and asserts no collection remains, including
when a child fails to complete its own shutdown cleanup. It never resets a development
or production database. Temporary registry/projects/tarballs are removed in `finally`;
the redacted checksum/result report stays in `.tmp/release/external-host-result.json`.

CI runs this verification before release eligibility. Public manifests include npm
provenance/access configuration; actual publication requires the maintainer's CI
identity and all G2 gates. No credentials, tests, env files, caches or Storybook output
are included in public tarballs. Root, applications and examples remain private.

The catalog fixture verifies trusted declared integrations without approval records:
protected durable events, public service calls, user authorization and preserved data.
Its normal backend uses one CMS instance. The separate upgrade fixture explicitly opts
into cluster coordination to keep testing the advanced deployment profile.

The physical external backend then runs `fixtures/catalog-conformance.mjs` through
the distributed conformance CLI. All nine required scenarios must pass, including
missing-provider, headless imports, live Chromium requests, the applied migration,
reload cleanup, data-preserving removal and the generated TypeScript SDK overlay.
The CLI reports `status: incomplete` for static checks alone, `failed` (exit 1) for
an assertion/missing scenario/teardown failure, and `passed, complete: true` only
after all nine scenarios and cleanup. Scenario logs go to stderr; stdout is JSON.

The migration scenario also stops the CMS and restores a fixture snapshot into an
empty dedicated DB: BSON documents, indexes, local media bytes and configuration.
It cold-starts the restored host and verifies login, installed state, catalog, media
SHA-256 and readiness. `catalog-recovery.mjs` is a fixture helper, not a production
backup tool. Temporary secret files stay private and are removed with the fixture.

`.tmp/release/catalog-conformance-result.json` records each scenario and local
six-plugin startup/RSS plus 50 serial HTTP read latencies after five warmups. These
measurements are a local baseline, not deployment capacity. Human and staging
acceptance explicitly remain pending. Use the
[team acceptance procedure](../../docs/cms/architecture/plugin-platform/single-instance-acceptance.md).
