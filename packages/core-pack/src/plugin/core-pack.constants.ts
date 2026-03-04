/**
 * Canonical identifier for the core-pack plugin.
 * Shared across manifest, modules, and API metadata.
 */
export const CORE_PACK_PLUGIN_ID = "core-pack" as const;

/**
 * Source identifier used for policy rules created manually via core-pack HTTP APIs.
 * It is intentionally different from `CORE_PACK_PLUGIN_ID` so manifest sync
 * does not overwrite runtime/admin-defined rules.
 */
export const CORE_PACK_MANUAL_POLICY_SOURCE = "core-pack-manual" as const;
