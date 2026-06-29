import { useMemo, useState } from "react";
import { Badge, Button, Input, Select } from "@trinacria-cms/trinacria-ui";
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
  const [statusFilter, setStatusFilter] = useState<PluginAccessGrantDraft["status"] | "all">("all");
  const [query, setQuery] = useState("");
  const grants = useMemo(() => parsePluginAccessGrantDrafts(draftValue), [draftValue]);
  const filteredGrants = useMemo(
    () =>
      grants.filter((grant) => {
        if (statusFilter !== "all" && grant.status !== statusFilter) return false;
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return true;
        return [
          grant.producerPluginId,
          grant.consumerPluginId,
          grant.eventName,
          grant.payloadType,
          grant.accessType,
          grant.requiredPermission,
          grant.reason
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      }),
    [grants, query, statusFilter]
  );
  const statusCounts = useMemo(
    () =>
      grants.reduce(
        (accumulator, grant) => ({
          ...accumulator,
          [grant.status]: accumulator[grant.status] + 1
        }),
        { pending: 0, approved: 0, denied: 0, revoked: 0 }
      ),
    [grants]
  );

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
        <div className="grid gap-3">
          <div className="grid gap-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-subtle)] p-3 md:grid-cols-[1fr_220px]">
            <Input
              label={t("common.actions.search", "Cerca")}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            <Select
              label={t("common.table.status", "Stato")}
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.currentTarget.value as PluginAccessGrantDraft["status"] | "all"
                )
              }
            >
              <option value="all">{t("common.filters.all", "Tutti")}</option>
              <option value="pending">
                {t("common.status.pending", "pending")} ({statusCounts.pending})
              </option>
              <option value="approved">
                {t("common.status.approved", "approved")} ({statusCounts.approved})
              </option>
              <option value="denied">
                {t("common.status.denied", "denied")} ({statusCounts.denied})
              </option>
              <option value="revoked">
                {t("common.status.revoked", "revoked")} ({statusCounts.revoked})
              </option>
            </Select>
          </div>

          {filteredGrants.length === 0 ? (
            <EmptyState
              text={t(
                "settings.plugin_permissions.no_matches",
                "Nessuna richiesta corrisponde ai filtri."
              )}
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-[color:var(--color-border)]">
              <div className="grid bg-[color:var(--color-surface-subtle)] px-4 py-2 text-xs font-semibold uppercase text-[color:var(--color-ink-muted)] md:grid-cols-[1fr_1fr_1fr_auto]">
                <span>{t("settings.plugin_permissions.consumer", "Consumer")}</span>
                <span>{t("settings.plugin_permissions.access", "Accesso")}</span>
                <span>{t("common.table.status", "Stato")}</span>
                <span>{t("common.table.action", "Azione")}</span>
              </div>
              {filteredGrants.map((grant) => (
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
                    <Badge tone={readGrantStatusTone(grant.status)}>{grant.status}</Badge>
                    {grant.reason ? (
                      <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                        {grant.reason}
                      </p>
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
        </div>
      )}
    </section>
  );
}

function readGrantStatusTone(status: PluginAccessGrantDraft["status"]) {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  return "neutral";
}
