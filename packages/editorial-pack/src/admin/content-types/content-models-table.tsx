import {
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
  DropdownMenu,
  DropdownMenuItem,
  Icon,
  IconButton,
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList
} from "@trinacria-cms/trinacria-ui";
import type { EditorialContentType } from "../editorial-admin.types.js";

export type ModelsView = "available" | "deleted";

export function ContentModelsTable({
  models,
  onConfigure,
  onCreate,
  onDelete,
  onPermanentDelete,
  onRestore,
  view
}: {
  models: readonly EditorialContentType[];
  onConfigure: (id: string) => void;
  onCreate: () => void;
  onDelete: (model: EditorialContentType) => void;
  onPermanentDelete: (model: EditorialContentType) => void;
  onRestore: (model: EditorialContentType) => void;
  view: ModelsView;
}) {
  const header = <ModelsTableHeader count={models.length} onCreate={onCreate} view={view} />;

  return (
    <DataTable
      mobile={
        <div className="grid gap-3 md:hidden">
          {header}
          {models.length ? (
            <MobileRecordList>
              {models.map((model) => (
                <MobileRecordCard
                  key={model.id}
                  title={model.name}
                  subtitle={model.key}
                  badges={<ModelIcon model={model} />}
                  actions={
                    <ModelActionsMenu
                      model={model}
                      view={view}
                      onConfigure={onConfigure}
                      onDelete={onDelete}
                      onPermanentDelete={onPermanentDelete}
                      onRestore={onRestore}
                    />
                  }
                >
                  <MobileRecordField
                    label={statusColumnLabel(view)}
                    value={modelStatus(model, view)}
                  />
                </MobileRecordCard>
              ))}
            </MobileRecordList>
          ) : (
            <EmptyModelsState view={view} onCreate={onCreate} />
          )}
        </div>
      }
    >
      <DataTableTable>
        <DataTableHead>
          <DataTableHeaderRow>
            <DataTableHeadCell
              colSpan={5}
              className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4 shadow-[inset_0_-1px_0_var(--color-border)]"
            >
              {header}
            </DataTableHeadCell>
          </DataTableHeaderRow>
          <DataTableHeaderRow>
            <DataTableHeadCell className="w-16">
              <span className="sr-only">Icona</span>
            </DataTableHeadCell>
            <DataTableHeadCell>Modello</DataTableHeadCell>
            <DataTableHeadCell>Slug</DataTableHeadCell>
            <DataTableHeadCell>{statusColumnLabel(view)}</DataTableHeadCell>
            <DataTableHeadCell className="text-right">Azioni</DataTableHeadCell>
          </DataTableHeaderRow>
        </DataTableHead>
        <DataTableBody>
          {models.length ? (
            models.map((model) => (
              <DataTableRow key={model.id}>
                <DataTableCell>
                  <ModelIcon model={model} />
                </DataTableCell>
                <DataTablePrimaryCell>{model.name}</DataTablePrimaryCell>
                <DataTableCell className="font-mono text-xs text-[color:var(--color-ink-muted)]">
                  {model.key}
                </DataTableCell>
                <DataTableCell className="text-[color:var(--color-ink-muted)]">
                  {modelStatus(model, view)}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-end">
                    <ModelActionsMenu
                      model={model}
                      view={view}
                      onConfigure={onConfigure}
                      onDelete={onDelete}
                      onPermanentDelete={onPermanentDelete}
                      onRestore={onRestore}
                    />
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <DataTableRow>
              <DataTableCell colSpan={5} className="p-0">
                <EmptyModelsState view={view} onCreate={onCreate} />
              </DataTableCell>
            </DataTableRow>
          )}
        </DataTableBody>
      </DataTableTable>
    </DataTable>
  );
}

function ModelsTableHeader({
  count,
  onCreate,
  view
}: {
  count: number;
  onCreate: () => void;
  view: ModelsView;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid gap-1">
        <span className="text-sm font-semibold leading-6 text-[color:var(--color-ink)]">
          {view === "available" ? "Modelli disponibili" : "Modelli eliminati"}
        </span>
        <span className="text-xs font-normal leading-5 text-[color:var(--color-ink-muted)]">
          {count} {count === 1 ? "modello" : "modelli"}{" "}
          {view === "available" ? "disponibili per la redazione" : "nel cestino"}.
        </span>
      </div>
      <Button type="button" size="sm" onClick={onCreate}>
        <Icon name="plus" />
        Nuovo modello
      </Button>
    </div>
  );
}

function ModelActionsMenu({
  model,
  onConfigure,
  onDelete,
  onPermanentDelete,
  onRestore,
  view
}: {
  model: EditorialContentType;
  onConfigure: (id: string) => void;
  onDelete: (model: EditorialContentType) => void;
  onPermanentDelete: (model: EditorialContentType) => void;
  onRestore: (model: EditorialContentType) => void;
  view: ModelsView;
}) {
  return (
    <DropdownMenu
      align="end"
      contentClassName="min-w-[220px]"
      trigger={
        <IconButton
          icon="more-horizontal"
          label={`Azioni per ${model.name}`}
          variant="secondary"
          size="sm"
        />
      }
    >
      {view === "available" ? (
        <>
          <DropdownMenuItem
            icon="settings-2"
            title="Configura"
            description="Modifica campi e workflow"
            onClick={() => onConfigure(model.id)}
          />
          <DropdownMenuItem
            icon="trash-2"
            title="Elimina"
            description="Sposta il modello nel cestino"
            tone="danger"
            onClick={() => onDelete(model)}
          />
        </>
      ) : (
        <>
          <DropdownMenuItem
            icon="refresh-cw"
            title="Ripristina"
            description="Rendi nuovamente disponibile il modello"
            onClick={() => onRestore(model)}
          />
          <DropdownMenuItem
            icon="trash-2"
            title="Elimina definitivamente"
            description="Questa azione è irreversibile"
            tone="danger"
            onClick={() => onPermanentDelete(model)}
          />
        </>
      )}
    </DropdownMenu>
  );
}

function EmptyModelsState({ view, onCreate }: { view: ModelsView; onCreate: () => void }) {
  const isAvailable = view === "available";
  return (
    <div className="grid min-h-56 place-items-center p-6 text-center">
      <div>
        <Icon
          name={isAvailable ? "file-text" : "trash-2"}
          className="mx-auto h-6 w-6 text-[color:var(--color-ink-subtle)]"
        />
        <h2 className="mt-4 font-semibold text-[color:var(--color-ink)]">
          {isAvailable ? "Nessun modello disponibile" : "Il cestino è vuoto"}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
          {isAvailable
            ? "Crea il primo modello per definire i contenuti della redazione."
            : "I modelli eliminati compariranno qui e potranno essere ripristinati."}
        </p>
        {isAvailable ? (
          <Button className="mt-4" type="button" onClick={onCreate}>
            <Icon name="plus" />
            Nuovo modello
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ModelIcon({ model }: { model: EditorialContentType }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-md bg-[color:var(--color-surface-subtle)] text-[color:var(--color-ink-subtle)]">
      <Icon name={model.icon ?? "file-text"} />
    </span>
  );
}

function statusColumnLabel(view: ModelsView) {
  return view === "available" ? "Stato" : "Eliminato il";
}

function modelStatus(model: EditorialContentType, view: ModelsView) {
  if (view === "deleted") return formatDeletedAt(model.deletedAt);
  return model.status === "active" ? "Attivo" : "Archiviato";
}

function formatDeletedAt(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
