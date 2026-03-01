# 0003 - Plugin Admin Integration

## Modello consigliato

- `apps/admin`: shell ufficiale React
- `core-pack`: espone API base admin (users, roles, settings, workspaces)
- plugin dominio: esportano backend + admin manifest

## Admin manifest (proposta)

Ogni plugin admin deve esporre:

- `id`, `version`
- `menuItems`
- `routes`
- `requiredPermissions`
- opzionale `widgets`

La shell admin monta menu e route in modo dinamico in base ai plugin registrati.
