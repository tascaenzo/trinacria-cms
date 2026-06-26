import type { TranslateFn } from "./i18n.js";

export function translateStatusLabel(status: string, t: TranslateFn): string {
  switch (status) {
    case "active":
      return t("common.status.active");
    case "suspended":
      return t("common.status.suspended");
    case "disabled":
      return t("common.status.disabled");
    case "revoked":
      return t("common.status.revoked");
    default:
      return status;
  }
}

export function translateSystemStateLabel(state: string, t: TranslateFn): string {
  switch (state) {
    case "ok":
      return t("common.system_state.ok");
    case "degraded":
      return t("common.system_state.degraded");
    case "down":
      return t("common.system_state.down");
    case "loading":
      return t("common.system_state.loading");
    case "unknown":
      return t("common.system_state.unknown");
    default:
      return state;
  }
}

export function translateToneLabel(
  tone: "neutral" | "success" | "warning",
  t: TranslateFn
): string {
  switch (tone) {
    case "success":
      return t("common.tone.success");
    case "warning":
      return t("common.tone.warning");
    default:
      return t("common.tone.info");
  }
}

export function translateSettingSource(source: string, t: TranslateFn): string {
  switch (source) {
    case "value":
      return t("common.setting_source.value");
    case "default":
      return t("common.setting_source.default");
    default:
      return source;
  }
}
