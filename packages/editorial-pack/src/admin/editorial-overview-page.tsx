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
  EmptyState,
  ErrorBanner,
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList,
  PageHeader,
  Panel,
  ResourcePage
} from "@trinacria-cms/trinacria-ui";
import { useCallback, useEffect, useState } from "react";
import type {
  CmsClient,
  EditorialContentType,
  EditorialEntryRecord,
  EditorialNavigator
} from "./editorial-admin.types.js";
import { toEditorialDisplayError } from "./lib/editorial-admin-errors.js";

const STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  in_review: "In revisione",
  approved: "Approvato",
  published: "Pubblicato"
};

export interface EditorialOverviewPageContext {
  cms: CmsClient;
  navigateToRoute?: EditorialNavigator;
}

/** Editorial landing page: shared operating picture with permission-aware shortcuts. */
export function EditorialOverviewPage({ cms, navigateToRoute }: EditorialOverviewPageContext) {
  const [entries, setEntries] = useState<readonly EditorialEntryRecord[]>([]);
  const [contentTypes, setContentTypes] = useState<readonly EditorialContentType[]>([]);
  const [canManageModels, setCanManageModels] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await cms.auth.getAuthenticatedUser();
      const [entryResult, contentTypeResult, permissionResult] = await Promise.all([
        cms.request<{ data: readonly EditorialEntryRecord[] }>({
          method: "GET",
          path: "/v1/editorial/entries",
          query: { limit: 100, offset: 0 }
        }),
        cms.request<{ data: readonly EditorialContentType[] }>({
          method: "GET",
          path: "/v1/editorial/content-types",
          query: { limit: 100, offset: 0 }
        }),
        cms.security.listUserEffectivePermissions({ path: { id: user.data.id } })
      ]);
      setEntries(entryResult.data);
      setContentTypes(contentTypeResult.data);
      setCanManageModels(permissionResult.data.includes("editorial-pack:content-types:manage"));
    } catch (currentError) {
      setError(
        toEditorialDisplayError(
          currentError,
          "Non è stato possibile caricare la panoramica editoriale."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [cms]);

  useEffect(() => void load(), [load]);

  const recentEntries = entries.slice(0, 6);
  const contentTypeById = new Map(contentTypes.map((contentType) => [contentType.id, contentType]));
  const openEntry = (entry: EditorialEntryRecord) =>
    navigateToRoute?.(
      "editorial-entry-detail",
      new URLSearchParams({ entryId: entry.id, modelId: entry.contentTypeId })
    );

  return (
    <main className="w-full py-2">
      <ResourcePage
        header={
          <PageHeader
            title="Panoramica editoriale"
            description="Consulta prima i modelli disponibili, poi riprendi il lavoro sui contenuti aggiornati di recente."
          />
        }
        feedback={error ? <ErrorBanner message={error} /> : undefined}
      >
        <ContentTypesOverview
          canManageModels={canManageModels}
          contentTypes={contentTypes}
          isLoading={isLoading}
          onManageModels={() => navigateToRoute?.("editorial-content-types")}
          onOpen={(contentType) =>
            navigateToRoute?.(
              "editorial-content-type",
              new URLSearchParams({ modelId: contentType.id })
            )
          }
        />
        <RecentEntries
          contentTypeById={contentTypeById}
          entries={recentEntries}
          isLoading={isLoading}
          onOpen={openEntry}
          onShowAll={() => navigateToRoute?.("editorial-entries")}
        />
      </ResourcePage>
    </main>
  );
}

function ContentTypesOverview({
  canManageModels,
  contentTypes,
  isLoading,
  onManageModels,
  onOpen
}: {
  canManageModels: boolean;
  contentTypes: readonly EditorialContentType[];
  isLoading: boolean;
  onManageModels: () => void;
  onOpen: (contentType: EditorialContentType) => void;
}) {
  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <span className="text-sm font-semibold leading-6 text-[color:var(--color-ink)]">
          Modelli
        </span>
        <span className="text-xs font-normal leading-5 text-[color:var(--color-ink-muted)]">
          I modelli definiscono struttura, campi e workflow dei contenuti editoriali.
        </span>
      </div>
      {canManageModels ? (
        <Button type="button" variant="secondary" size="sm" onClick={onManageModels}>
          Gestisci modelli
        </Button>
      ) : null}
    </div>
  );

  return (
    <DataTable
      mobile={
        <div className="grid gap-3 md:hidden">
          <Panel className="p-4">{header}</Panel>
          {isLoading ? (
            <Panel aria-hidden="true" className="h-40 animate-pulse" />
          ) : contentTypes.length ? (
            <MobileRecordList>
              {contentTypes.map((contentType) => (
                <MobileRecordCard
                  key={contentType.id}
                  title={contentType.name}
                  subtitle={contentType.key}
                  badges={<ContentTypeStatus status={contentType.status} />}
                  actions={
                    canManageModels ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpen(contentType)}
                      >
                        Gestisci
                      </Button>
                    ) : undefined
                  }
                >
                  <MobileRecordField label="Aggiornato" value={formatDate(contentType.updatedAt)} />
                </MobileRecordCard>
              ))}
            </MobileRecordList>
          ) : (
            <EmptyState text="Non ci sono ancora modelli configurati." />
          )}
        </div>
      }
    >
      <DataTableTable>
        <DataTableHead>
          <DataTableHeaderRow>
            <DataTableHeadCell
              colSpan={4}
              className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4 shadow-[inset_0_-1px_0_var(--color-border)]"
            >
              {header}
            </DataTableHeadCell>
          </DataTableHeaderRow>
          <DataTableHeaderRow>
            <DataTableHeadCell>Modello</DataTableHeadCell>
            <DataTableHeadCell>Stato</DataTableHeadCell>
            <DataTableHeadCell>Aggiornato</DataTableHeadCell>
            <DataTableHeadCell className="text-right">Azioni</DataTableHeadCell>
          </DataTableHeaderRow>
        </DataTableHead>
        <DataTableBody>
          {isLoading ? (
            [0, 1, 2].map((item) => (
              <DataTableRow key={item}>
                <DataTableCell colSpan={4} className="p-0">
                  <div className="h-[73px] animate-pulse bg-[color:var(--color-panel)]" />
                </DataTableCell>
              </DataTableRow>
            ))
          ) : contentTypes.length ? (
            contentTypes.map((contentType) => (
              <DataTableRow
                key={contentType.id}
                role={canManageModels ? "button" : undefined}
                tabIndex={canManageModels ? 0 : undefined}
                className={canManageModels ? "cursor-pointer" : undefined}
                onClick={canManageModels ? () => onOpen(contentType) : undefined}
                onKeyDown={
                  canManageModels
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpen(contentType);
                        }
                      }
                    : undefined
                }
              >
                <DataTablePrimaryCell meta={contentType.key}>
                  {contentType.name}
                </DataTablePrimaryCell>
                <DataTableCell>
                  <ContentTypeStatus status={contentType.status} />
                </DataTableCell>
                <DataTableCell className="text-[color:var(--color-ink-muted)]">
                  {formatDate(contentType.updatedAt)}
                </DataTableCell>
                <DataTableCell>
                  {canManageModels ? (
                    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpen(contentType)}
                      >
                        Gestisci
                      </Button>
                    </div>
                  ) : null}
                </DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <DataTableRow>
              <DataTableCell colSpan={4} className="p-0">
                <p className="p-5 text-sm text-[color:var(--color-ink-muted)]">
                  Non ci sono ancora modelli configurati.
                </p>
              </DataTableCell>
            </DataTableRow>
          )}
        </DataTableBody>
      </DataTableTable>
    </DataTable>
  );
}

function RecentEntries({
  contentTypeById,
  entries,
  isLoading,
  onOpen,
  onShowAll
}: {
  contentTypeById: ReadonlyMap<string, EditorialContentType>;
  entries: readonly EditorialEntryRecord[];
  isLoading: boolean;
  onOpen: (entry: EditorialEntryRecord) => void;
  onShowAll: () => void;
}) {
  return (
    <DataTable
      mobile={
        <div className="grid gap-3 md:hidden">
          <Panel className="p-4">
            <RecentEntriesHeader onShowAll={onShowAll} />
          </Panel>
          {isLoading ? (
            <Panel aria-hidden="true" className="h-40 animate-pulse" />
          ) : entries.length ? (
            <MobileRecordList>
              {entries.map((entry) => (
                <MobileRecordCard
                  key={entry.id}
                  title={entry.title ?? "Senza titolo"}
                  subtitle={entry.slug ?? "Senza slug"}
                  badges={<EntryStatus status={entry.status} />}
                  actions={
                    <Button type="button" variant="ghost" size="sm" onClick={() => onOpen(entry)}>
                      Apri
                    </Button>
                  }
                >
                  <MobileRecordField label="Aggiornato" value={formatDate(entry.updatedAt)} />
                  <MobileRecordField
                    label="Modello"
                    value={contentTypeById.get(entry.contentTypeId)?.name ?? "Modello rimosso"}
                  />
                </MobileRecordCard>
              ))}
            </MobileRecordList>
          ) : (
            <EmptyState text="Non ci sono ancora contenuti." />
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
              <RecentEntriesHeader onShowAll={onShowAll} />
            </DataTableHeadCell>
          </DataTableHeaderRow>
          <DataTableHeaderRow>
            <DataTableHeadCell>Contenuto</DataTableHeadCell>
            <DataTableHeadCell>Modello</DataTableHeadCell>
            <DataTableHeadCell>Stato</DataTableHeadCell>
            <DataTableHeadCell>Aggiornato</DataTableHeadCell>
            <DataTableHeadCell className="text-right">Azioni</DataTableHeadCell>
          </DataTableHeaderRow>
        </DataTableHead>
        <DataTableBody>
          {isLoading ? (
            [0, 1, 2].map((item) => (
              <DataTableRow key={item}>
                <DataTableCell colSpan={5} className="p-0">
                  <div className="h-[73px] animate-pulse bg-[color:var(--color-panel)]" />
                </DataTableCell>
              </DataTableRow>
            ))
          ) : entries.length ? (
            entries.map((entry) => (
              <DataTableRow
                key={entry.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => onOpen(entry)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen(entry);
                  }
                }}
              >
                <DataTablePrimaryCell meta={entry.slug ?? "Senza slug"}>
                  {entry.title ?? "Senza titolo"}
                </DataTablePrimaryCell>
                <DataTableCell className="text-[color:var(--color-ink-muted)]">
                  {contentTypeById.get(entry.contentTypeId)?.name ?? "Modello rimosso"}
                </DataTableCell>
                <DataTableCell>
                  <EntryStatus status={entry.status} />
                </DataTableCell>
                <DataTableCell className="text-[color:var(--color-ink-muted)]">
                  {formatDate(entry.updatedAt)}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onOpen(entry)}>
                      Apri
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))
          ) : (
            <DataTableRow>
              <DataTableCell colSpan={5} className="p-0">
                <p className="p-5 text-sm text-[color:var(--color-ink-muted)]">
                  Non ci sono ancora contenuti.
                </p>
              </DataTableCell>
            </DataTableRow>
          )}
        </DataTableBody>
      </DataTableTable>
    </DataTable>
  );
}

function RecentEntriesHeader({ onShowAll }: { onShowAll: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <span className="text-sm font-semibold leading-6 text-[color:var(--color-ink)]">
          Ultimi contenuti
        </span>
        <span className="text-xs font-normal leading-5 text-[color:var(--color-ink-muted)]">
          Gli ultimi sei contenuti aggiornati. Apri un contenuto per continuare a lavorarci.
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onShowAll}>
          Vedi tutti
        </Button>
      </div>
    </div>
  );
}

function ContentTypeStatus({ status }: { status: EditorialContentType["status"] }) {
  return (
    <span className="inline-flex rounded-full bg-[color:var(--color-panel-soft)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-ink-muted)]">
      {status === "active" ? "Attivo" : "Archiviato"}
    </span>
  );
}

function EntryStatus({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full bg-[color:var(--color-panel-soft)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-ink-muted)]">
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
