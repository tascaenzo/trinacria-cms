import type {
  PluginManifest,
} from "../contracts/plugin-manifest.js";
import {
  ValidationError,
  formatValidationError,
  s,
  type Infer,
} from "@trinacria/schema";
import {
  PluginCompatibilityError,
  PluginManifestError,
} from "../errors/plugin-errors.js";
import {
  isValidVersion,
  isValidVersionRange,
  satisfiesVersion,
} from "./semver.js";

const PLUGIN_ID_REGEX = /^[a-z0-9][a-z0-9-._/]*$/;

const pluginDependencySchema = s.object(
  {
    pluginId: s
      .string({ trim: true, minLength: 1, pattern: PLUGIN_ID_REGEX })
      .refine(
        (value) => !value.includes("//"),
        "Dependency pluginId cannot contain empty path segments",
        "invalid_plugin_id_segment",
      ),
    versionRange: s
      .string({ trim: true, minLength: 1 })
      .refine(
        (value) => isValidVersionRange(value),
        "Dependency versionRange is not a supported semver range",
        "invalid_version_range",
      ),
    optional: s.boolean().optional().default(false),
  },
  { strict: true },
);

const pluginManifestSchema = s
  .object(
    {
      id: s
        .string({ trim: true, minLength: 1, pattern: PLUGIN_ID_REGEX })
        .refine(
          (value) => !value.includes("//"),
          "Plugin id cannot contain empty path segments",
          "invalid_plugin_id_segment",
        ),
      version: s
        .string({ trim: true, minLength: 1 })
        .refine(
          (value) => isValidVersion(value),
          "Plugin version must be a valid semver",
          "invalid_semver_version",
        ),
      requiresCore: s
        .string({ trim: true, minLength: 1 })
        .refine(
          (value) => isValidVersionRange(value),
          "requiresCore must be a supported semver range",
          "invalid_core_range",
        ),
      capabilities: s
        .array(
          s.string({ trim: true, minLength: 1, pattern: /^[a-z0-9][a-z0-9._-]*$/ }),
          { unique: true },
        )
        .optional()
        .default([]),
      dependencies: s
        .array(pluginDependencySchema, {
          unique: (dependency) => dependency.pluginId,
        })
        .optional()
        .default([]),
    },
    { strict: true },
  )
  .refine(
    (manifest) =>
      (manifest.dependencies ?? []).every(
        (dependency) => dependency.pluginId !== manifest.id,
      ),
    "Plugin cannot depend on itself",
    "self_dependency",
  );

type ParsedPluginManifest = Infer<typeof pluginManifestSchema>;

/**
 * Validates manifest shape and normalizes data for runtime usage.
 */
export function validatePluginManifest(input: unknown): PluginManifest {
  try {
    const parsed: ParsedPluginManifest = pluginManifestSchema.parse(input);
    const dependencies = (parsed.dependencies ?? []).map((dependency) => ({
      pluginId: dependency.pluginId,
      versionRange: dependency.versionRange,
      optional: dependency.optional,
    }));

    return {
      id: parsed.id,
      version: parsed.version,
      requiresCore: parsed.requiresCore,
      capabilities: [...(parsed.capabilities ?? [])],
      dependencies,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new PluginManifestError(
        formatValidationError(error, {
          prefix: "Invalid plugin manifest:",
          rootLabel: "manifest",
        }),
        {
          issues: error.issues,
        },
      );
    }
    throw new PluginManifestError("Unexpected plugin manifest validation error", {
      cause: String(error),
    });
  }
}

/**
 * Ensures a validated manifest is compatible with the current core version.
 */
export function assertPluginCompatibility(
  manifest: PluginManifest,
  coreVersion: string,
): void {
  if (!isValidVersion(coreVersion)) {
    throw new PluginCompatibilityError("Current core version is not valid semver", {
      coreVersion,
      pluginId: manifest.id,
    });
  }

  if (!satisfiesVersion(coreVersion, manifest.requiresCore)) {
    throw new PluginCompatibilityError(
      `Plugin "${manifest.id}" requires core version "${manifest.requiresCore}" but current version is "${coreVersion}"`,
      {
        pluginId: manifest.id,
        required: manifest.requiresCore,
        current: coreVersion,
      },
    );
  }
}
