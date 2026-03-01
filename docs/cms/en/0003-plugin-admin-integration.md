# 0003 - Plugin Admin Integration

## Recommended model

- `apps/admin`: official React shell
- `core-pack`: exposes base admin APIs (users, roles, settings, workspaces)
- domain plugins: export backend + admin manifest

## Admin manifest (proposal)

Each admin plugin should expose:

- `id`, `version`
- `menuItems`
- `routes`
- `requiredPermissions`
- optional `widgets`

The admin shell mounts menu and routes dynamically based on registered plugins.
