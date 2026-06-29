# Email Module

The email module owns email provider configuration and delivery. It is intentionally provider-based
and reads configuration from the settings system instead of `.env`.

## Structure

- `services/email-config.service.ts` resolves delivery settings and secrets from core settings.
- `services/email-delivery.service.ts` selects the configured provider and sends messages.
- `email-settings.ts` declares the plugin settings seeded from the email-pack manifest.
- `email-request.types.ts` defines the secure payload contract used by event-driven email delivery.

## Providers

Current providers are:

- `disabled`: rejects delivery.
- `console`: logs the outbound email for development.
- `smtp`: sends through Nodemailer using settings stored in the database.

Adding a provider should be done in `services/email-delivery.service.ts` and should keep secrets in
the settings secrets API.
