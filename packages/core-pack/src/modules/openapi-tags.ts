/**
 * Centralized OpenAPI tags used by core-pack controllers.
 * Keeping these values in one place prevents accidental tag drift in Swagger.
 */
export const CORE_PACK_OPENAPI_TAGS = {
  AUTH: "Auth",
  USERS: "Users",
  ROLES: "Roles",
  PERMISSIONS: "Permissions",
  SECURITY: "Security",
  SETTINGS: "Settings",
  INSTALLATION: "Installation"
} as const;
