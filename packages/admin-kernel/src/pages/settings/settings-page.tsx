import { Button, Dialog, useToast } from "@trinacria-cms/trinacria-ui";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorBanner } from "../../components/resource-feedback.js";
import { useI18n } from "../../lib/i18n.js";
import { toDisplayError } from "../../lib/sdk-errors.js";
import type {
  AdminSettingsSectionRenderContext,
  RenderableAdminSettingsSection
} from "../../runtime/admin-route-runtime.js";
import {
  getBackofficeNavigationEventName,
  getBackofficeRouteStateParam,
  writeBackofficeNavigationState
} from "../../runtime/backoffice-navigation-state.js";
import { cms } from "../../runtime/cms-sdk.js";
import { SettingsSectionForm, SettingsWorkspaceSidebar } from "./settings-page.components.js";
import { useSettingsDefinitions, useSettingsSectionDrafts } from "./settings-page.hooks.js";
import {
  filterRecordsForSettingsSection,
  formatSettingFormLabel,
  isVisibleSettingDefinition,
  isVisibleSettingsSection,
  parseSettingFormValue
} from "./settings-page.utils.js";

export interface SettingsPageProps {
  sectionContext?: Omit<AdminSettingsSectionRenderContext, "section">;
  settings?: readonly RenderableAdminSettingsSection[];
}

export function SettingsPage({ sectionContext, settings = [] }: SettingsPageProps = {}) {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const [isInspectOpen] = useState(true);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(() => {
    return getBackofficeRouteStateParam("section") ?? settings[0]?.id ?? null;
  });

  const { error, isLoading, records, refresh } = useSettingsDefinitions();
  const visibleRecords = useMemo(() => records.filter(isVisibleSettingDefinition), [records]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCustomSectionDirty, setIsCustomSectionDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMfaRequiredConfirmationOpen, setIsMfaRequiredConfirmationOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    { type: "section"; sectionId: string } | { type: "close" } | null
  >(null);

  useEffect(() => {
    function handleNavigationChange() {
      const section = getBackofficeRouteStateParam("section");
      if (section) {
        setActiveSectionId(section);
      }
    }

    const navigationEventName = getBackofficeNavigationEventName();
    window.addEventListener(navigationEventName, handleNavigationChange);
    window.addEventListener("popstate", handleNavigationChange);
    return () => {
      window.removeEventListener(navigationEventName, handleNavigationChange);
      window.removeEventListener("popstate", handleNavigationChange);
    };
  }, []);

  const activateSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setSaveError(null);
    const params = new URLSearchParams();
    params.set("section", sectionId);
    writeBackofficeNavigationState("settings", params);
  };

  async function saveSettingsSection(confirmMfaRequired = false) {
    const editableRecords = selectedSectionRecords.filter(
      (record) => record.mutable && record.status === "active"
    );
    if (editableRecords.length === 0) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      const updates = editableRecords.map((record) => {
        if (record.secret) {
          return {
            record,
            value: sectionDraftValues[record.key] ?? ""
          };
        }

        try {
          return {
            record,
            value: parseSettingFormValue(record, sectionDraftValues[record.key] ?? "")
          };
        } catch (currentError) {
          const detail =
            currentError instanceof Error
              ? currentError.message
              : t("settings.form.invalid_value", "Valore non valido.");
          throw new Error(`${formatSettingFormLabel(record)}: ${detail}`, { cause: currentError });
        }
      });

      const isEnablingRequiredMfa = updates.some(
        ({ record, value }) => record.key === "core-pack:auth:mfa_mode" && value === "required"
      );
      if (isEnablingRequiredMfa && !confirmMfaRequired) {
        setIsMfaRequiredConfirmationOpen(true);
        return;
      }

      await Promise.all(
        updates.map(({ record, value }) => {
          if (record.secret) {
            const plaintext = String(value).trim();
            if (!plaintext) {
              return Promise.resolve();
            }
            return cms.settings.upsertSettingSecret({
              path: { key: record.key },
              body: {
                plaintext,
                updatedBy: "backoffice"
              }
            });
          }

          return cms.settings.upsertSettingValue({
            path: { key: record.key },
            body: {
              value,
              updatedBy: "backoffice"
            }
          });
        })
      );

      const message = t("settings.form.saved", "Impostazioni salvate.");
      pushToast({
        tone: "success",
        title: t("official.route.settings.title", "Impostazioni"),
        description: message,
        duration: 4000
      });
      markSectionDraftsSaved();
      void refresh();
    } catch (currentError) {
      const message = toDisplayError(currentError);
      setSaveError(message);
      pushToast({
        tone: "danger",
        title: t("common.feedback.save_error", "Salvataggio non riuscito"),
        description: message,
        duration: 0
      });
    } finally {
      setIsSaving(false);
    }
  }

  function closeSettingsWorkspaceImmediately() {
    writeBackofficeNavigationState("dashboard");
  }

  const operationalSettings = useMemo(
    () =>
      settings.filter(
        (section) => !section.id.endsWith("settings-catalog") && isVisibleSettingsSection(section)
      ),
    [settings]
  );

  const selectedSection = useMemo(() => {
    const sectionId = activeSectionId ?? operationalSettings[0]?.id ?? null;
    return (
      operationalSettings.find((section) => section.id === sectionId) ??
      operationalSettings[0] ??
      null
    );
  }, [activeSectionId, operationalSettings]);

  const selectedSectionRecords = useMemo(
    () => (selectedSection ? filterRecordsForSettingsSection(visibleRecords, selectedSection) : []),
    [selectedSection, visibleRecords]
  );
  const {
    isSectionDirty,
    isSectionValuesLoading,
    markSectionDraftsSaved,
    resetSectionDraftValues,
    sectionDraftValues,
    sectionValueErrors,
    setSectionDraftValues
  } = useSettingsSectionDrafts(selectedSectionRecords, t);
  const hasUnsavedChanges = isSectionDirty || isCustomSectionDirty;

  useEffect(() => {
    setIsCustomSectionDirty(false);
  }, [selectedSection?.id]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [hasUnsavedChanges]);

  function handleSelectSection(sectionId: string) {
    if (sectionId === selectedSection?.id) return;
    if (hasUnsavedChanges) {
      setPendingNavigation({ type: "section", sectionId });
      return;
    }
    activateSection(sectionId);
  }

  function closeSettingsWorkspace() {
    if (hasUnsavedChanges) {
      setPendingNavigation({ type: "close" });
      return;
    }
    closeSettingsWorkspaceImmediately();
  }

  function discardChangesAndContinue() {
    const navigation = pendingNavigation;
    resetSectionDraftValues();
    setIsCustomSectionDirty(false);
    setPendingNavigation(null);
    if (navigation?.type === "section") {
      activateSection(navigation.sectionId);
    } else if (navigation?.type === "close") {
      closeSettingsWorkspaceImmediately();
    }
  }

  function handleSectionDraftValueChange(recordKey: string, value: string) {
    setSectionDraftValues((current) => ({ ...current, [recordKey]: value }));
    setSaveError(null);
  }

  return (
    <div className="h-full min-h-0">
      <Dialog
        open={isInspectOpen}
        title={t("official.route.settings.title", "Impostazioni")}
        description={t(
          "settings.workspace.summary",
          "Configura il backoffice e le funzionalità installate."
        )}
        closeLabel={t("common.actions.close")}
        closeShortcutLabel="Esc"
        closeVariant="icon"
        onClose={closeSettingsWorkspace}
        width="fullscreen"
      >
        {error ? (
          <div className="p-6">
            <ErrorBanner message={error} />
          </div>
        ) : null}
        {isLoading ? <EmptyState text={t("settings.empty.loading_definitions")} /> : null}
        {!isLoading ? (
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-[color:var(--color-panel-soft)] lg:grid-cols-[288px_minmax(0,1fr)] lg:grid-rows-1">
            <SettingsWorkspaceSidebar
              onSelectSection={handleSelectSection}
              sections={operationalSettings}
              selectedSection={selectedSection}
              t={t}
            />

            <section className="min-h-0">
              <SettingsSectionForm
                draftValues={sectionDraftValues}
                editableRecords={selectedSectionRecords}
                isDirty={isSectionDirty}
                isLoading={isSectionValuesLoading}
                isSaving={isSaving}
                onDraftValueChange={handleSectionDraftValueChange}
                onCustomDirtyChange={setIsCustomSectionDirty}
                onReset={() => {
                  resetSectionDraftValues();
                  setSaveError(null);
                }}
                onSave={() => void saveSettingsSection()}
                saveError={saveError}
                section={selectedSection}
                sectionContext={sectionContext}
                t={t}
                valueErrors={sectionValueErrors}
              />
            </section>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={pendingNavigation !== null}
        onClose={() => setPendingNavigation(null)}
        title={t("settings.unsaved.title", "Modifiche non salvate")}
        description={t(
          "settings.unsaved.summary",
          "Salva le modifiche oppure scartale prima di lasciare questa sezione."
        )}
        width="md"
        variant="modal"
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setPendingNavigation(null)}>
            {t("common.actions.cancel", "Annulla")}
          </Button>
          <Button type="button" onClick={discardChangesAndContinue}>
            {t("common.actions.discard", "Scarta modifiche")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={isMfaRequiredConfirmationOpen}
        onClose={() => setIsMfaRequiredConfirmationOpen(false)}
        title={t("settings.mfa_required.title", "Require two-factor authentication?")}
        description={t(
          "settings.mfa_required.summary",
          "Review the impact before saving this policy."
        )}
        width="md"
        variant="modal"
      >
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {t(
              "settings.mfa_required.line1",
              "At the next password login, every user without 2FA will be guided through setup before receiving a session."
            )}
          </p>
          <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
            {t(
              "settings.mfa_required.line2",
              "Users who already configured 2FA will need their authenticator or a recovery code to sign in."
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsMfaRequiredConfirmationOpen(false)}
            >
              {t("common.actions.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsMfaRequiredConfirmationOpen(false);
                void saveSettingsSection(true);
              }}
            >
              {t("common.actions.save", "Salva")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
