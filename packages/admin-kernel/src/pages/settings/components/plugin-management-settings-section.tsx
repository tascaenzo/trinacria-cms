import { useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableHeaderRow,
  DataTablePrimaryCell,
  DataTableRow,
  DataTableTable,
  Dialog,
  FeedbackBanner,
  Input
} from "@trinacria-cms/trinacria-ui";
import { EmptyState, ErrorBanner } from "../../../components/resource-feedback.js";
import type { AdminSettingsSectionRenderContext } from "../../../runtime/admin-route-runtime.js";
import type { PluginOperation, PluginSnapshot } from "../../plugins/plugin-operations.types.js";
import { pluginStateTone } from "../../plugins/plugin-operations-utils.js";
import { usePluginOperations } from "../../plugins/use-plugin-operations.js";

interface PendingOperation {
  plugin: PluginSnapshot;
  operation: Extract<PluginOperation, "disable" | "unload">;
}

export function PluginManagementSettingsSection({ section, t }: AdminSettingsSectionRenderContext) {
  const [pendingOperation, setPendingOperation] = useState<PendingOperation | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const {
    plugins,
    isInventoryLoading,
    isRunningOperation,
    inventoryError,
    operationError,
    refresh,
    executeOperation
  } = usePluginOperations({ includeEvents: false });

  async function runOperation(plugin: PluginSnapshot, operation: PluginOperation, reason?: string) {
    setSuccess(null);
    const response = await executeOperation(plugin.id, operation, reason);
    if (response) {
      setSuccess(
        `${t("plugins.operations." + response.operation, response.operation)} · ${response.plugin.id}`
      );
      return true;
    }
    return false;
  }

  function requestOperation(plugin: PluginSnapshot, operation: PluginOperation) {
    if (operation === "disable" || operation === "unload") {
      setDisableReason("");
      setPendingOperation({ plugin, operation });
      return;
    }
    void runOperation(plugin, operation);
  }

  async function confirmPendingOperation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingOperation) return;
    const completed = await runOperation(
      pendingOperation.plugin,
      pendingOperation.operation,
      pendingOperation.operation === "disable" ? disableReason.trim() || undefined : undefined
    );
    if (completed) {
      setPendingOperation(null);
      setDisableReason("");
    }
  }

  return (
    <div className="min-h-0 overflow-auto px-6 py-4 sm:px-8 sm:py-6">
      <div className="mx-auto grid max-w-6xl gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[color:var(--color-ink)]">{section.title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--color-ink-muted)]">
              {section.summary ?? "Gestisci lo stato dei plugin disponibili nel runtime."}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void refresh()}>
            {t("common.actions.refresh", "Aggiorna")}
          </Button>
        </div>

        {success ? (
          <FeedbackBanner
            tone="success"
            title={t("plugins.feedback.operation_success", "Operazione completata.")}
            message={success}
          />
        ) : null}
        {inventoryError ? <ErrorBanner message={inventoryError} /> : null}
        {operationError ? <ErrorBanner message={operationError} /> : null}
        {isInventoryLoading ? (
          <EmptyState text={t("plugins.empty.loading", "Caricamento plugin...")} />
        ) : null}
        {!isInventoryLoading && plugins.length === 0 ? (
          <EmptyState text={t("plugins.empty.none", "Nessun plugin registrato.")} />
        ) : null}

        {!isInventoryLoading && plugins.length > 0 ? (
          <DataTable>
            <DataTableTable>
              <DataTableHead>
                <DataTableHeaderRow>
                  <DataTableHeadCell>{t("plugins.table.plugin", "Plugin")}</DataTableHeadCell>
                  <DataTableHeadCell>{t("plugins.table.state", "Stato")}</DataTableHeadCell>
                  <DataTableHeadCell>{t("plugins.table.source", "Origine")}</DataTableHeadCell>
                  <DataTableHeadCell>
                    {t("plugins.table.capabilities", "Capability")}
                  </DataTableHeadCell>
                  <DataTableHeadCell>{t("common.table.action", "Azioni")}</DataTableHeadCell>
                </DataTableHeaderRow>
              </DataTableHead>
              <DataTableBody>
                {plugins.map((plugin) => (
                  <DataTableRow key={plugin.id}>
                    <DataTablePrimaryCell meta={`v${plugin.version}`}>
                      {plugin.id}
                    </DataTablePrimaryCell>
                    <DataTableCell>
                      <Badge tone={pluginStateTone(plugin.state)}>{plugin.state}</Badge>
                    </DataTableCell>
                    <DataTableCell className="text-[color:var(--color-ink-muted)]">
                      {plugin.source ? `${plugin.source.type} · ${plugin.source.name}` : "—"}
                    </DataTableCell>
                    <DataTableCell>{plugin.capabilities.length}</DataTableCell>
                    <DataTableCell>
                      <div className="flex flex-wrap gap-2">
                        {plugin.operations
                          .filter((entry) => entry.operation !== "reload")
                          .map((entry) => (
                            <Button
                              key={entry.operation}
                              size="sm"
                              variant={
                                entry.operation === "disable" || entry.operation === "unload"
                                  ? "secondary"
                                  : "ghost"
                              }
                              title={entry.available ? undefined : entry.reason}
                              disabled={!entry.available || isRunningOperation !== null}
                              isLoading={isRunningOperation === entry.operation}
                              onClick={() => requestOperation(plugin, entry.operation)}
                            >
                              {entry.operation === "unload"
                                ? t(
                                    "settings.plugin_management.remove_runtime",
                                    "Rimuovi dal runtime"
                                  )
                                : t("plugins.operations." + entry.operation, entry.operation)}
                            </Button>
                          ))}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTableTable>
          </DataTable>
        ) : null}
      </div>

      <Dialog
        open={pendingOperation !== null}
        onClose={() => setPendingOperation(null)}
        closeVariant="icon"
        closeLabel={t("common.actions.close", "Chiudi")}
        title={
          pendingOperation?.operation === "unload"
            ? t("settings.plugin_management.remove_runtime", "Rimuovi dal runtime")
            : t("plugins.operations.disable", "Disabilita")
        }
        description={pendingOperation?.plugin.id}
        width="md"
      >
        <form className="grid gap-4" onSubmit={(event) => void confirmPendingOperation(event)}>
          {pendingOperation?.operation === "disable" ? (
            <Input
              label={t("plugins.actions.disable_reason", "Motivo disabilitazione")}
              hint={t("plugins.actions.disable_reason_hint", "Nota opzionale per l'operatore.")}
              value={disableReason}
              onChange={(event) => setDisableReason(event.target.value)}
            />
          ) : (
            <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
              {t(
                "settings.plugin_management.remove_runtime_hint",
                "Il plugin verrà scaricato dal runtime. Il pacchetto rimane installato."
              )}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingOperation(null)}>
              {t("common.actions.cancel", "Annulla")}
            </Button>
            <Button type="submit" disabled={isRunningOperation !== null}>
              {isRunningOperation
                ? t("plugins.actions.running", "Esecuzione...")
                : t("common.actions.confirm", "Conferma")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
