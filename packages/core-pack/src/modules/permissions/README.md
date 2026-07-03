# Permissions Module

The permissions module stores the canonical permission keys contributed by `core-pack` and loaded
plugins.

## Structure

- `services/` contains permission business rules, including protection for built-in core
  permissions.
- `repositories/` contains persistence and cache-aware lookup code.
- `dto/`, `permissions.schemas.ts`, `permissions.controller.ts`, and `permissions.module.ts`
  expose the HTTP and module wiring surface.

## Development Notes

Permission keys are security-sensitive identifiers. Validate and normalize them in the repository,
and keep editability rules in the service. When plugin manifests add new permissions, provisioning
should flow through the security module rather than direct controller calls.
