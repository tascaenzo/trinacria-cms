import { useState, type FormEvent } from "react";
import { Button, Dialog, FeedbackBanner, Input } from "@trinacria-cms/trinacria-ui";
import { ErrorBanner } from "../components/resource-feedback.js";
import { useI18n } from "../lib/i18n.js";
import { PluginDetail } from "./plugins/plugin-detail.js";
import { PluginInventory } from "./plugins/plugin-inventory.js";
import { PluginLifecycleEvents } from "./plugins/plugin-lifecycle-events.js";
import type { PluginOperation } from "./plugins/plugin-operations.types.js";
import { usePluginOperations } from "./plugins/use-plugin-operations.js";

export function PluginOperationsPage() {
  const { t } = useI18n();
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const {
    plugins,
    selectedPlugin,
    selectedPluginId,
    events,
    isInventoryLoading,
    isEventsLoading,
    isRunningOperation,
    inventoryError,
    eventsError,
    operationError,
    setSelectedPluginId,
    refresh,
    executeOperation
  } = usePluginOperations();

  async function runOperation(operation: PluginOperation, reason?: string): Promise<boolean> {
    if (!selectedPlugin) return false;

    setSuccess(null);
    const response = await executeOperation(selectedPlugin.id, operation, reason);
    if (response) {
      setSuccess(
        `${t(`plugins.operations.${response.operation}`, response.operation)} · ${response.plugin.id} · ${response.plugin.state}`
      );
      return true;
    }
    return false;
  }

  async function confirmDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await runOperation("disable", disableReason.trim() || undefined)) {
      setIsDisableDialogOpen(false);
      setDisableReason("");
    }
  }

  function openDisableDialog() {
    setDisableReason("");
    setIsDisableDialogOpen(true);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <PluginInventory
        error={inventoryError}
        isLoading={isInventoryLoading}
        plugins={plugins}
        selectedPluginId={selectedPluginId}
        t={t}
        onRefresh={() => void refresh()}
        onSelect={setSelectedPluginId}
      />

      <div className="grid gap-4">
        {success ? (
          <FeedbackBanner
            tone="success"
            title={t("plugins.feedback.operation_success")}
            message={success}
          />
        ) : null}
        {operationError ? <ErrorBanner message={operationError} /> : null}

        <PluginDetail
          isRunningOperation={isRunningOperation}
          plugin={selectedPlugin}
          t={t}
          onDisable={openDisableDialog}
          onOperation={(operation) => void runOperation(operation)}
        />
        {selectedPlugin ? (
          <PluginLifecycleEvents
            error={eventsError}
            events={events}
            isLoading={isEventsLoading}
            t={t}
          />
        ) : null}
      </div>

      <Dialog
        open={isDisableDialogOpen}
        onClose={() => setIsDisableDialogOpen(false)}
        closeVariant="icon"
        closeLabel={t("common.actions.close")}
        title={t("plugins.actions.disable")}
        description={selectedPlugin?.id}
        width="md"
      >
        <form className="grid gap-4" onSubmit={(event) => void confirmDisable(event)}>
          <Input
            label={t("plugins.actions.disable_reason")}
            hint={t("plugins.actions.disable_reason_hint")}
            value={disableReason}
            onChange={(event) => setDisableReason(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsDisableDialogOpen(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isRunningOperation !== null}>
              {isRunningOperation === "disable"
                ? t("plugins.actions.running")
                : t("common.actions.disable")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
