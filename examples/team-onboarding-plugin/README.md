# Team onboarding reference plugin

This package is a copyable, runnable reference for the Trinacria CMS beta use
case: install the CMS, invite a colleague, assign the right role, configure the
welcome journey, and inspect the resulting plugin lifecycle audit.

It demonstrates the complete manifest layer:

- lifecycle hooks (`onLoad`, `onUnload`)
- namespaced permissions and role grants
- plugin-owned settings
- subscription to `core-pack:user-invited`
- an audit event contract
- generic dashboard and settings contributions for the backoffice

## Run it from a clean checkout

```bash
npm install
docker compose up -d mongo
npm run build -w @trinacria-cms/example-team-onboarding-plugin
PLAYGROUND_TEAM_ONBOARDING_PLUGIN=1 npm run dev:playground
```

Open the backoffice and complete the initial setup, then inspect **Plugins** and
**Settings**. The plugin is discovered as a workspace source and its security,
settings, event, and admin declarations are visible through the normal runtime.

Copy this directory to start a real plugin. Replace the package name and plugin
ID first, then add a domain module, repository, controller, and SDK contract as
your use case requires.
