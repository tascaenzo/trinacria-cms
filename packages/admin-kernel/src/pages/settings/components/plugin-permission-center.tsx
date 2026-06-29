import { useMemo, useState } from "react";
import { Badge, Button } from "@trinacria-cms/trinacria-ui";
import { ErrorBanner, EmptyState } from "../../../components/resource-feedback.js";
import type { TranslateFn } from "../../../lib/i18n.js";
import { toDisplayError } from "../../../lib/sdk-errors.js";
import { cms } from "../../../runtime/cms-sdk.js";
import type { SettingDefinitionRecord } from "../settings-page.utils.js";
import {
  getPluginGrantId,
  parsePluginAccessGrantDrafts,
  type PluginAccessGrantDraft
} from "../utils/plugin-permission-grants.js";

interface PluginPermissionCenterProps {
  draftValue: string;
  isSaving: boolean;
  onChange: (value: string) => void;
  record: SettingDefinitionRecord;
  t: TranslateFn;
}

export function PluginPermissionCenter({
  draftValue,
  isSaving,
  onChange,
  record,
  t
}: PluginPermissionCenterProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const grants = useMemo(() => parsePluginAccessGrantDrafts(draftValue), [draftValue]);

  async function updateGrant(
    grant: PluginAccessGrantDraft,
    status: PluginAccessGrantDraft["status"]
  ) {
    const now = new Date().toISOString();
    const next = grants.map((item) =>
      getPluginGrantId(item) === getPluginGrantId(grant)
        ? {
            ...item,
            id: getPluginGrantId(item),
            status,
            approvedBy: status === "approved" ? "backoffice" : item.approvedBy,
            approvedAt: status === "approved" ? now : item.approvedAt,
            updatedAt: now
          }
        : item
    );
    onChange(JSON.stringify(next, null, 2));
    try {
      setLocalError(null);
      setLocalMessage(null);
      await cms.settings.upsertSettingValue({
        path: { key: record.key },
        body: { value: next, updatedBy: "backoffice" }
      });
      setLocalMessage(t("settings.plugin_permissions.saved", "Permissione aggiornata."));
    } catch (error) {
      setLocalError(toDisplayError(error));
    }
  }

  return (
    <section className="grid gap-4">
      <div>
        <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">
          {t("settings.plugin_permissions.access_requests", "Richieste accesso plugin")}
        </h4>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          {t(
            "settings.plugin_permissions.access_requests_summary",
            "Approva o revoca accessi a eventi sensibili e payload sicuri."
          )}
        </p>
      </div>
      {localError ? <ErrorBanner message={localError} /> : null}
      {localMessage ? (
        <p className="text-sm font-medium text-[color:var(--color-success-ink)]">{localMessage}</p>
      ) : null}
      {grants.length === 0 ? (
        <EmptyState
          text={t("settings.plugin_permissions.empty", "Nessuna richiesta registrata.")}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[color:var(--color-border)]">
          <div className="grid bg-[color:var(--color-surface-subtle)] px-4 py-2 text-xs font-semibold uppercase text-[color:var(--color-ink-muted)] md:grid-cols-[1fr_1fr_1fr_auto]">
            <span>{t("settings.plugin_permissions.consumer", "Consumer")}</span>
            <span>{t("settings.plugin_permissions.access", "Accesso")}</span>
            <span>{t("common.table.status", "Stato")}</span>
            <span>{t("common.table.action", "Azione")}</span>
          </div>
          {grants.map((grant) => (
            <div
              key={getPluginGrantId(grant)}
              className="grid gap-3 border-t border-[color:var(--color-border)] px-4 py-3 text-sm md:grid-cols-[1fr_1fr_1fr_auto] md:items-center"
            >
              <div>
                <p className="font-semibold text-[color:var(--color-ink)]">
                  {grant.producerPluginId} {"->"} {grant.consumerPluginId}
                </p>
                <p className="text-xs text-[color:var(--color-ink-muted)]">{grant.eventName}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-[color:var(--color-ink)]">
                  {grant.payloadType ?? grant.accessType ?? "event"}
                </p>
                <p className="truncate text-xs text-[color:var(--color-ink-muted)]">
                  {grant.requiredPermission}
                </p>
              </div>
              <div>
                <Badge>{grant.status}</Badge>
                {grant.reason ? (
                  <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">{grant.reason}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving || grant.status === "approved"}
                  onClick={() => void updateGrant(grant, "approved")}
                >
                  {t("common.actions.approve", "Approva")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isSaving || grant.status === "denied"}
                  onClick={() => void updateGrant(grant, "denied")}
                >
                  {t("common.actions.deny", "Nega")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isSaving || grant.status === "revoked"}
                  onClick={() => void updateGrant(grant, "revoked")}
                >
                  {t("common.actions.revoke", "Revoca")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
