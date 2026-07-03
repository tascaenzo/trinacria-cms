# Roles Module

The roles module owns role records and the permission grants attached to each role.

## Structure

- `services/` contains role business logic, including lifecycle changes and grant hydration.
- `repositories/` contains persistence adapters for role records.
- `grants/` contains the role-to-permission grant persistence model.
- `dto/`, `roles.schemas.ts`, `roles.controller.ts`, and `roles.module.ts` expose the HTTP and
  module wiring surface.

## Development Notes

Keep role lifecycle rules in `services/roles.service.ts`. Repository classes should stay focused
on database access and cache invalidation. When adding role fields, update the DTO, schema,
repository parsing, and admin resource metadata together.
