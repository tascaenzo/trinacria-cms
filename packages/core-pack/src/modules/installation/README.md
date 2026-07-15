# Installation Module

The installation module owns first-run bootstrap state, local admin credential creation, and the
initial manifest provisioning required before the CMS is usable.

## Structure

- `services/` contains bootstrap orchestration and password hashing.
- `repositories/` contains installation state and local credential persistence.
- `dto/`, `installation.schemas.ts`, `installation.controller.ts`, and `installation.module.ts`
  expose the HTTP and module wiring surface.

## Development Notes

Bootstrap logic touches users, credentials, settings, and manifest provisioning. Keep orchestration
in `services/installation.service.ts` and avoid duplicating setup work in controllers. Password
hashing must stay algorithm-versioned so future migrations can be introduced without breaking
existing credentials.
