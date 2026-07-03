# Security Module

The security module connects users, roles, permissions, policy rules, and plugin-provided security
manifests.

## Structure

- `services/` contains cross-module authorization and provisioning services.
- `policies/` contains pure policy helpers and authorization rule composition.
- `user-access/` owns user-role assignments and effective access calculation.
- `role-policy-rules/` owns role-scoped policy rule endpoints.
- `dto/`, `security.tokens.ts`, and `security.module.ts` expose the module wiring surface.

## Development Notes

Keep security decisions in services or policy helpers, not controllers. Controllers should parse
input, call a service, and return a response. When adding third-party plugin authorization, keep
ownership metadata explicit so grants can be audited, revoked, and safely cleaned up.
