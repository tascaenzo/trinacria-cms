import {
  Badge,
  FormSection,
  Panel,
  SettingsSectionLayout,
  Switch,
  useToast
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorBanner } from "../../../components/resource-feedback.js";
import type { TranslateFn } from "../../../lib/i18n.js";
import { toDisplayError } from "../../../lib/sdk-errors.js";
import type { AdminSettingsSectionRenderContext } from "../../../runtime/admin-route-runtime.js";
import { cms } from "../../../runtime/cms-sdk.js";
import { toEditableSettingInput } from "../settings-page.utils.js";
import {
  getPluginGrantId,
  type PluginAccessGrantDraft,
  parsePluginAccessGrantDrafts
} from "../utils/plugin-permission-grants.js";

const PLUGIN_ACCESS_GRANTS_SETTING_KEY = "core-pack:security:plugin_access_grants";

interface PluginPermissionCenterProps {
  draftValue: string;
  isSaving: boolean;
  onChange: (value: string) => void;
  settingKey: string;
  t: TranslateFn;
}

export function PluginPermissionCenterSection({ section, t }: AdminSettingsSectionRenderContext) {
  const settingKey = section.settingKeys?.[0] ?? PLUGIN_ACCESS_GRANTS_SETTING_KEY;
  const [draftValue, setDraftValue] = useState("[]");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadGrantSetting() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await cms.settings.getSettingValueByKey({ path: { key: settingKey } });
        if (isCancelled) return;
        setDraftValue(toEditableSettingInput(response.data?.value ?? []));
      } catch (currentError) {
        if (isCancelled) return;
        setDraftValue("[]");
        setError(toDisplayError(currentError));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadGrantSetting();

    return () => {
      isCancelled = true;
    };
  }, [settingKey]);

  if (isLoading) {
    return (
      <SettingsSectionLayout title={section.title} description={section.summary}>
        <EmptyState text={t("settings.empty.loading_value", "Caricamento valore...")} />
      </SettingsSectionLayout>
    );
  }

  return (
    <SettingsSectionLayout
      title={section.title}
      description={section.summary}
      feedback={error ? <ErrorBanner message={error} /> : undefined}
    >
      <PluginPermissionCenter
        draftValue={draftValue}
        isSaving={false}
        onChange={setDraftValue}
        settingKey={settingKey}
        t={t}
      />
    </SettingsSectionLayout>
  );
}

export function PluginPermissionCenter({
  draftValue,
  isSaving,
  onChange,
  settingKey,
  t
}: PluginPermissionCenterProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { pushToast } = useToast();
  const grants = useMemo(() => parsePluginAccessGrantDrafts(draftValue), [draftValue]);

  async function updateGrant(
    grant: PluginAccessGrantDraft,
    status: Extract<PluginAccessGrantDraft["status"], "approved" | "denied">
  ) {
    const now = new Date().toISOString();
    const next = grants.map((item) =>
      getPluginGrantId(item) === getPluginGrantId(grant)
        ? toJsonGrantDraft({
            ...item,
            id: getPluginGrantId(item),
            status,
            ...(status === "approved" ? { approvedBy: "backoffice", approvedAt: now } : {}),
            updatedAt: now
          })
        : toJsonGrantDraft(item)
    );
    onChange(JSON.stringify(next, null, 2));
    try {
      setIsUpdating(true);
      setLocalError(null);
      await cms.settings.upsertSettingValue({
        path: { key: settingKey },
        body: { value: next, updatedBy: "backoffice" }
      });
      const message = t("settings.plugin_permissions.saved", "Permissione aggiornata.");
      pushToast({
        tone: "success",
        title: "Permessi plugin",
        description: message,
        duration: 4000
      });
    } catch (error) {
      const message = toDisplayError(error);
      setLocalError(message);
      pushToast({
        tone: "danger",
        title: "Salvataggio non riuscito",
        description: message,
        duration: 0
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <FormSection
      headingLevel={3}
      variant="plain"
      title={t("settings.plugin_permissions.access_requests", "Richieste accesso plugin")}
      description={t(
        "settings.plugin_permissions.access_requests_summary",
        "Abilita o disabilita l'accesso dei plugin a eventi sensibili e payload sicuri."
      )}
    >
      {localError ? <ErrorBanner message={localError} /> : null}
      {grants.length === 0 ? (
        <EmptyState
          text={t("settings.plugin_permissions.empty", "Nessuna richiesta registrata.")}
        />
      ) : (
        <div className="grid gap-3">
          {grants.map((grant) => {
            const isApproved = grant.status === "approved";
            return (
              <Panel
                as="article"
                key={getPluginGrantId(grant)}
                className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              >
                <div className="grid min-w-0 gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-[color:var(--color-ink)]">
                      {grant.consumerPluginId}
                    </span>
                    <span className="text-[color:var(--color-ink-muted)]">richiede accesso a</span>
                    <span className="font-semibold text-[color:var(--color-ink)]">
                      {grant.producerPluginId}
                    </span>
                  </div>
                  <div className="grid gap-1 text-sm">
                    <p className="break-all font-mono text-xs text-[color:var(--color-ink-muted)]">
                      {grant.eventName}
                    </p>
                    {grant.requiredPermission ? (
                      <p className="break-all font-mono text-xs text-[color:var(--color-ink-muted)]">
                        {grant.requiredPermission}
                      </p>
                    ) : null}
                  </div>
                  {grant.reason ? (
                    <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
                      {grant.reason}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 justify-self-start md:justify-self-end">
                  <Badge tone={isApproved ? "success" : "neutral"}>
                    {isApproved
                      ? t("settings.plugin_permissions.enabled", "Abilitato")
                      : t("settings.plugin_permissions.disabled", "Disabilitato")}
                  </Badge>
                  <Switch
                    compact
                    checked={isApproved}
                    disabled={isSaving || isUpdating}
                    label={`${grant.consumerPluginId} ${grant.eventName}`}
                    onChange={(event) =>
                      void updateGrant(grant, event.currentTarget.checked ? "approved" : "denied")
                    }
                  />
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}

function toJsonGrantDraft(grant: PluginAccessGrantDraft): PluginAccessGrantDraft {
  return {
    producerPluginId: grant.producerPluginId,
    consumerPluginId: grant.consumerPluginId,
    eventName: grant.eventName,
    requiredPermission: grant.requiredPermission,
    status: grant.status,
    ...(grant.id ? { id: grant.id } : {}),
    ...(grant.accessType ? { accessType: grant.accessType } : {}),
    ...(grant.payloadType ? { payloadType: grant.payloadType } : {}),
    ...(grant.reason ? { reason: grant.reason } : {}),
    ...(grant.approvedBy ? { approvedBy: grant.approvedBy } : {}),
    ...(grant.approvedAt ? { approvedAt: grant.approvedAt } : {}),
    ...(grant.updatedAt ? { updatedAt: grant.updatedAt } : {})
  };
}
