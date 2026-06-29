# Settings Module

The settings module owns plugin settings, encrypted secrets, runtime configuration, plugin auth,
and the plugin permission center policy.

## Structure

- `services/` contains the main settings application service.
- `plugin-access/` contains policy logic for event subscription grants and secure payload claims.
- `definitions/`, `values/`, and `secrets/` contain persistence repositories.
- `auth/` contains signed plugin caller authentication.
- `config/` contains runtime setting readers.
- `_shared/` contains reusable parsing, JSON, key, and error helpers.

## Plugin Access Grants

Plugin access grants are stored as settings so administrators can manage them from the backoffice.
The policy is wired into kernel tokens:

- `PLUGIN_EVENT_SUBSCRIPTION_AUTHORIZER`
- `SECURE_EVENT_PAYLOAD_AUTHORIZER`

This keeps authorization centralized while leaving each plugin responsible for declaring its own
events, required permissions, and secure payload types.

New imports should use `services/` and `plugin-access/`. The module barrel in `index.ts` re-exports
the public surface from those directories.
