export class SettingsAccessError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "SettingsAccessError";
    this.code = code;
    this.details = details;
  }
}

export function createSettingsOwnerAccessError(input: {
  action: string;
  key: string;
  requesterPluginId: string;
  ownerPluginId: string;
}): SettingsAccessError {
  return new SettingsAccessError(
    "auth_forbidden_settings_owner_required",
    `Plugin "${input.requesterPluginId}" cannot ${input.action} setting key "${input.key}" owned by "${input.ownerPluginId}"`,
    {
      action: input.action,
      key: input.key,
      requesterPluginId: input.requesterPluginId,
      ownerPluginId: input.ownerPluginId,
    },
  );
}
