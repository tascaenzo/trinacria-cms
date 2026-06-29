# Email Templates Module

The email templates module owns reusable email template records and rendering.

## Structure

- `services/` contains template seeding, lookup, upsert, and rendering.
- `repositories/` contains persistence for template records.
- `email-template-defaults.ts` contains embedded default templates installed when the plugin loads.
- `dto/`, schemas, controller, tokens, and module files expose the backoffice API.

## Rendering

Templates use simple `{{ variable }}` replacement. The service validates that all declared
variables are provided before rendering. Keep templates generic and avoid embedding sensitive tokens
directly in normal events; sensitive values should arrive through secure payload claims.
