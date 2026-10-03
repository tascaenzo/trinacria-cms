# Distribution verification

Run with Node/npm from `.nvmrc` and the root manifest:

```sh
npm run release:pack
npm run release:test
```

`release:pack` builds then creates eight MIT tarballs in topological order. It checks
coordinated versions, exact internal dependencies, exported files, binaries and package
contents. `.tmp/release/release.json` records SHA-256, npm integrity and the complete
file inventory. It never publishes packages. Version 0.1.0 is currently an internal
fixture version; choose/fix the coordinated first beta version at G2 before publication.

`release:test` starts an isolated localhost registry for only `@trinacria-cms` artifacts.
Other declared dependencies resolve from the configured npm registry. It installs two
fresh projects outside this checkout with scripts disabled and no workspace symlinks:
backend without React, then admin with exactly one physical React copy. It cold-starts
all four official plugins on Mongo, typechecks public imports, builds a Vite admin from
public subpaths and opens the installation screen in Chromium. Trusted plugin renderers
are explicit host imports; upgrading renderer code requires rebuilding the admin host.

Mongo must be a replica set. `TRINACRIA_EXTERNAL_MONGO_URI` selects the test cluster;
the script always substitutes a fresh `trinacria_external_host_<random>_e2e` database
and removes only that database when the fixture exits. It never resets a development
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
