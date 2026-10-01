import { Button, Dialog, useToast } from "@trinacria-cms/trinacria-ui";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { serializeCsv } from "./file-manager/csv-editor.js";
import type {
  ApiEnvelope,
  DeleteTarget,
  MediaAsset,
  MediaDirectory,
  MediaFileManagerContext
} from "./file-manager/file-manager.types.js";
import {
  buildBreadcrumbs,
  matchesAcceptedMimeType,
  resolveUploadUrl,
  type StartedUpload,
  sha256,
  sortMediaItems,
  toDisplayError
} from "./file-manager/file-manager.utils.js";
import {
  FileManagerContextMenu,
  type FileManagerContextMenuState
} from "./file-manager/file-manager-context-menu.js";
import {
  ConfirmationDialog,
  CreateCsvDialog,
  CreateFolderDialog,
  type CsvDelimiter,
  MoveAssetDialog,
  RenameAssetDialog,
  TextFileDialog
} from "./file-manager/file-manager-dialogs.js";
import { FileManagerFrame } from "./file-manager/file-manager-frame.js";
import type { FileManagerSort } from "./file-manager/file-manager-toolbar.js";
import { MediaContentDialog } from "./file-manager/media-content-dialog.js";
import { AssetInspector, DirectoryInspector } from "./file-manager/media-inspectors.js";

export type {
  MediaAsset,
  MediaFileManagerContext,
  MediaFileManagerSelection
} from "./file-manager/file-manager.types.js";
export function MediaFileManager({
  acceptedMimeTypes,
  apiBaseUrl = "/cms",
  cms,
  onClose = () => undefined,
  onSelect,
  open = true,
  presentation = "page",
  selectLabel = "Usa media",
  selectionMode = "manage"
}: MediaFileManagerContext) {
  const [directories, setDirectories] = useState<readonly MediaDirectory[]>([]);
  const [assets, setAssets] = useState<readonly MediaAsset[]>([]);
  const [currentDirectoryId, setCurrentDirectoryId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"icons" | "list">("icons");
  const [search, setSearch] = useState("");
  const [detailsVisible, setDetailsVisible] = useState(true);
  const [sort, setSort] = useState<FileManagerSort>("name");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<FileManagerContextMenuState | null>(null);
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [textFileName, setTextFileName] = useState("untitled.txt");
  const [textFileContent, setTextFileContent] = useState("");
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState("dati.csv");
  const [csvColumns, setCsvColumns] = useState("nome\nvalore");
  const [csvDelimiter, setCsvDelimiter] = useState<CsvDelimiter>(",");
  const [csvCreateError, setCsvCreateError] = useState<string | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<MediaAsset | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [moveAsset, setMoveAsset] = useState<MediaAsset | null>(null);
  const [contentAsset, setContentAsset] = useState<MediaAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlCacheRef = useRef(new Map<string, { expiresAtMs: number; url: string }>());
  const { pushToast } = useToast();

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );
  const currentDirectory = useMemo(
    () => directories.find((directory) => directory.id === currentDirectoryId) ?? null,
    [currentDirectoryId, directories]
  );
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(currentDirectoryId, directories),
    [currentDirectoryId, directories]
  );
  const visibleAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets
      .filter(
        (asset) =>
          asset.status !== "deleted" &&
          matchesAcceptedMimeType(asset.mimeType, acceptedMimeTypes) &&
          (!query ||
            asset.displayName.toLowerCase().includes(query) ||
            asset.originalFilename.toLowerCase().includes(query) ||
            asset.mimeType.toLowerCase().includes(query))
      )
      .sort((left, right) => sortMediaItems(left, right, sort));
  }, [acceptedMimeTypes, assets, search, sort]);
  const visibleDirectories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return directories
      .filter(
        (directory) =>
          directory.parentId === (currentDirectoryId ?? undefined) &&
          (!query || directory.name.toLowerCase().includes(query))
      )
      .sort((left, right) => sortMediaItems(left, right, sort));
  }, [currentDirectoryId, directories, search, sort]);

  function reportActionSuccess(description: string) {
    pushToast({ tone: "success", title: "Media", description, duration: 4000 });
  }

  function reportActionError(currentError: unknown) {
    const message = toDisplayError(currentError);
    setError(message);
    pushToast({
      tone: "danger",
      title: "Operazione media non riuscita",
      description: message,
      duration: 0
    });
    return message;
  }

  const loadFileManagerEffect = useEffectEvent(() => loadFileManager());
  // biome-ignore lint/correctness/useExhaustiveDependencies: Directory navigation deliberately refreshes the latest selection.
  useEffect(() => {
    if (presentation === "modal" && !open) return;
    void loadFileManagerEffect();
  }, [currentDirectoryId, open, presentation]);

  async function loadFileManager() {
    try {
      setIsLoading(true);
      setError(null);
      const [nextDirectories, nextAssets] = await Promise.all([
        loadAllDirectories(),
        listAssets(currentDirectoryId)
      ]);
      setDirectories(nextDirectories);
      setAssets(nextAssets);
      setSelectedAssetId((current) =>
        nextAssets.some((asset) => asset.id === current) ? current : null
      );
    } catch (currentError) {
      reportActionError(currentError);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAllDirectories(): Promise<readonly MediaDirectory[]> {
    const all: MediaDirectory[] = [];
    const parents: Array<string | undefined> = [undefined];
    const visitedParents = new Set<string>();

    while (parents.length > 0) {
      const parentId = parents.shift();
      const parentKey = parentId ?? "__root__";
      if (visitedParents.has(parentKey)) continue;
      visitedParents.add(parentKey);
      const response = await cms.request<ApiEnvelope<readonly MediaDirectory[]>>({
        method: "GET",
        path: "/v1/media/directories",
        query: parentId ? { parentId } : undefined
      });
      for (const directory of response.data) {
        if (all.some((entry) => entry.id === directory.id)) continue;
        all.push(directory);
        parents.push(directory.id);
      }
    }
    return all;
  }

  async function listAssets(directoryId: string | null): Promise<readonly MediaAsset[]> {
    const response = await cms.request<ApiEnvelope<readonly MediaAsset[]>>({
      method: "GET",
      path: "/v1/media/assets",
      query: directoryId ? { directoryId, limit: 100 } : { rootOnly: true, limit: 100 }
    });
    return response.data;
  }

  const resolveAssetPreview = useCallback(
    async (assetId: string): Promise<string | null> => {
      const cached = previewUrlCacheRef.current.get(assetId);
      if (cached && cached.expiresAtMs > Date.now() + 10_000) return cached.url;
      try {
        const response = await cms.request<ApiEnvelope<{ url: string; expiresAt?: string }>>({
          method: "POST",
          path: `/v1/media/assets/${encodeURIComponent(assetId)}/access-url`
        });
        const url = resolveUploadUrl(response.data.url, apiBaseUrl);
        previewUrlCacheRef.current.set(assetId, {
          url,
          expiresAtMs: response.data.expiresAt
            ? Date.parse(response.data.expiresAt)
            : Date.now() + 240_000
        });
        return url;
      } catch {
        return null;
      }
    },
    [apiBaseUrl, cms]
  );

  async function selectAsset(asset: MediaAsset | null) {
    if (!asset || !onSelect) return;
    try {
      setIsSaving(true);
      setError(null);
      const url = await resolveAssetPreview(asset.id);
      if (!url) throw new Error("Non è stato possibile ottenere l’anteprima del media.");
      onSelect({ asset, url });
      onClose();
    } catch (currentError) {
      reportActionError(currentError);
    } finally {
      setIsSaving(false);
    }
  }

  async function createDirectory(nameOverride?: string) {
    const name = (nameOverride ?? "").trim();
    if (!name) return;
    try {
      setIsSaving(true);
      setError(null);
      await cms.request<ApiEnvelope<MediaDirectory>>({
        method: "POST",
        path: "/v1/media/directories",
        body: { name, ...(currentDirectoryId ? { parentId: currentDirectoryId } : {}) }
      });
      setIsCreateFolderOpen(false);
      setFolderName("");
      reportActionSuccess("Cartella creata.");
      await loadFileManager();
    } catch (currentError) {
      reportActionError(currentError);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateAsset(assetId: string, body: Record<string, unknown>) {
    try {
      setIsSaving(true);
      setError(null);
      const response = await cms.request<ApiEnvelope<MediaAsset>>({
        method: "PATCH",
        path: `/v1/media/assets/${encodeURIComponent(assetId)}`,
        body
      });
      const updatedAsset = response.data;
      const remainsInCurrentDirectory = (updatedAsset.directoryId ?? null) === currentDirectoryId;
      setAssets((current) =>
        remainsInCurrentDirectory
          ? current.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset))
          : current.filter((asset) => asset.id !== updatedAsset.id)
      );
      if (!remainsInCurrentDirectory) setSelectedAssetId(null);
      reportActionSuccess("Media aggiornato.");
      await loadFileManager();
    } catch (currentError) {
      reportActionError(currentError);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAsset(asset: MediaAsset) {
    try {
      setIsSaving(true);
      setError(null);
      await cms.request<ApiEnvelope<MediaAsset>>({
        method: "DELETE",
        path: `/v1/media/assets/${encodeURIComponent(asset.id)}`
      });
      setSelectedAssetId(null);
      reportActionSuccess("Media eliminato.");
      await loadFileManager();
    } catch (currentError) {
      reportActionError(currentError);
    } finally {
      setIsSaving(false);
    }
  }

  function navigateToDirectory(directoryId: string | null) {
    setSelectedAssetId(null);
    setCurrentDirectoryId(directoryId);
  }

  async function updateDirectory(directoryId: string, body: Record<string, unknown>) {
    try {
      setIsSaving(true);
      setError(null);
      await cms.request<ApiEnvelope<MediaDirectory>>({
        method: "PATCH",
        path: `/v1/media/directories/${encodeURIComponent(directoryId)}`,
        body
      });
      reportActionSuccess("Cartella aggiornata.");
      await loadFileManager();
    } catch (currentError) {
      reportActionError(currentError);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteDirectory(directory: MediaDirectory) {
    try {
      setIsSaving(true);
      setError(null);
      await cms.request<ApiEnvelope<MediaDirectory>>({
        method: "DELETE",
        path: `/v1/media/directories/${encodeURIComponent(directory.id)}`
      });
      setCurrentDirectoryId(directory.parentId ?? null);
      reportActionSuccess("Cartella eliminata.");
    } catch (currentError) {
      reportActionError(currentError);
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadFiles(files: FileList | readonly File[] | null): Promise<boolean> {
    if (!files?.length) return false;
    try {
      setIsSaving(true);
      setError(null);
      for (const file of Array.from(files)) {
        await transferFile(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      reportActionSuccess(
        files.length === 1 ? "Media caricato." : `${files.length} media caricati.`
      );
      await loadFileManager();
      return true;
    } catch (currentError) {
      reportActionError(currentError);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function transferFile(file: File, replacementAssetId?: string): Promise<MediaAsset> {
    const checksumSha256 = await sha256(file);
    const started = await cms.request<ApiEnvelope<StartedUpload>>({
      method: "POST",
      path: "/v1/media/uploads",
      body: {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
        checksumSha256,
        ...(replacementAssetId
          ? { replacementAssetId }
          : currentDirectoryId
            ? { directoryId: currentDirectoryId }
            : {})
      }
    });
    const uploadResponse = await fetch(
      resolveUploadUrl(started.data.upload.uploadUrl, apiBaseUrl),
      {
        method: "PUT",
        body: file,
        credentials: "include",
        headers: {
          ...(started.data.upload.method === "proxy"
            ? { "content-type": "application/octet-stream" }
            : {}),
          ...(started.data.upload.requiredHeaders ?? {})
        }
      }
    );
    if (!uploadResponse.ok)
      throw new Error(`Caricamento di ${file.name} non riuscito (${uploadResponse.status}).`);
    const completed = await cms.request<ApiEnvelope<MediaAsset>>({
      method: "POST",
      path: `/v1/media/uploads/${encodeURIComponent(started.data.session.id)}/complete`
    });
    return completed.data;
  }

  async function replaceAssetContent(asset: MediaAsset, content: string): Promise<boolean> {
    try {
      setIsSaving(true);
      setError(null);
      const file = new File([content], asset.originalFilename, { type: asset.mimeType });
      const updated = await transferFile(file, asset.id);
      previewUrlCacheRef.current.delete(asset.id);
      setAssets((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setContentAsset(updated);
      reportActionSuccess("Contenuto salvato.");
      await loadFileManager();
      return true;
    } catch (currentError) {
      reportActionError(currentError);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function openContextMenu(
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
    asset?: MediaAsset
  ) {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setContextMenu({
      x: "clientX" in event ? event.clientX : rect.left,
      y: "clientY" in event ? event.clientY : rect.bottom,
      ...(asset ? { asset } : {})
    });
  }

  function openCreateDirectoryDialog() {
    setFolderName("");
    setError(null);
    setIsCreateFolderOpen(true);
  }

  function submitCreateDirectory() {
    const name = folderName.trim();
    if (!name) return;
    void createDirectory(name);
  }

  async function createTextFile() {
    const filename = textFileName.trim();
    if (!filename) return;
    const normalizedFilename = filename.toLowerCase().endsWith(".txt")
      ? filename
      : `${filename}.txt`;
    if (
      await uploadFiles([new File([textFileContent], normalizedFilename, { type: "text/plain" })])
    ) {
      setTextFileName("untitled.txt");
      setTextFileContent("");
      setIsTextDialogOpen(false);
    }
  }

  function openCreateCsvDialog() {
    setCsvFileName("dati.csv");
    setCsvColumns("nome\nvalore");
    setCsvDelimiter(",");
    setCsvCreateError(null);
    setIsCsvDialogOpen(true);
  }

  async function createCsvFile() {
    const columns = csvColumns
      .split(/\r?\n/)
      .map((column) => column.trim())
      .filter(Boolean);
    if (!csvFileName.trim() || columns.length === 0) return;
    const filename = csvFileName.trim().toLowerCase().endsWith(".csv")
      ? csvFileName.trim()
      : `${csvFileName.trim()}.csv`;
    const content = `${serializeCsv({ delimiter: csvDelimiter, rows: [columns] })}\r\n`;
    try {
      setIsSaving(true);
      setCsvCreateError(null);
      setError(null);
      const created = await transferFile(new File([content], filename, { type: "text/csv" }));
      setIsCsvDialogOpen(false);
      reportActionSuccess("File CSV creato.");
      await loadFileManager();
      setContentAsset(created);
    } catch (currentError) {
      const nextError = reportActionError(currentError);
      setCsvCreateError(nextError);
    } finally {
      setIsSaving(false);
    }
  }

  function openRenameDialog(asset: MediaAsset) {
    setRenameTarget(asset);
    setRenameName(asset.displayName);
  }

  function submitRename() {
    const displayName = renameName.trim();
    if (!renameTarget || !displayName || displayName === renameTarget.displayName) return;
    const assetId = renameTarget.id;
    setRenameTarget(null);
    void updateAsset(assetId, { displayName });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    if (target.kind === "asset") void deleteAsset(target.value);
    else void deleteDirectory(target.value);
  }

  function moveAssetTo(directoryId: string | null) {
    if (!moveAsset) return;
    if (moveAsset.directoryId !== directoryId) {
      void updateAsset(moveAsset.id, directoryId ? { directoryId } : { clearDirectory: true });
    }
    setMoveAsset(null);
  }

  const inspector = selectedAsset ? (
    <AssetInspector
      asset={selectedAsset}
      apiBaseUrl={apiBaseUrl}
      directories={directories}
      cms={cms}
      disabled={isSaving}
      onDelete={() => setDeleteTarget({ kind: "asset", value: selectedAsset })}
      onSave={(body) => void updateAsset(selectedAsset.id, body)}
      onChanged={() => void loadFileManager()}
      onOpenContent={() => setContentAsset(selectedAsset)}
    />
  ) : currentDirectory ? (
    <DirectoryInspector
      directory={currentDirectory}
      directories={directories}
      disabled={isSaving}
      onDelete={() => setDeleteTarget({ kind: "directory", value: currentDirectory })}
      onSave={(body) => void updateDirectory(currentDirectory.id, body)}
    />
  ) : (
    <div className="flex h-full min-h-60 items-center justify-center p-8 text-center text-sm leading-6 text-(--color-ink-muted)">
      Seleziona un file o una cartella per visualizzarne i dettagli.
    </div>
  );

  const workspace = (
    <div
      className={
        presentation === "page" ? "relative h-[calc(100dvh-6rem)] min-h-[32rem]" : "relative h-full"
      }
      onClick={() => setContextMenu(null)}
    >
      <FileManagerFrame
        assets={visibleAssets}
        breadcrumbs={breadcrumbs}
        childDirectories={visibleDirectories}
        currentDirectory={currentDirectory}
        currentDirectoryId={currentDirectoryId}
        detailsVisible={detailsVisible}
        directories={directories}
        embedded={presentation === "modal"}
        error={error}
        fileInputRef={fileInputRef}
        inspector={inspector}
        isLoading={isLoading}
        isSaving={isSaving}
        onCreateFolder={openCreateDirectoryDialog}
        onCreateCsv={openCreateCsvDialog}
        onDetailsVisibleChange={setDetailsVisible}
        onNavigate={navigateToDirectory}
        onOpenAsset={(asset) =>
          selectionMode === "single" ? void selectAsset(asset) : setContentAsset(asset)
        }
        onAssetContextMenu={(asset, event) => openContextMenu(event, asset)}
        onBackgroundContextMenu={(event) => openContextMenu(event)}
        onSearchChange={setSearch}
        onSelectAsset={setSelectedAssetId}
        onSortChange={setSort}
        onUpload={(files) => void uploadFiles(files)}
        onViewModeChange={setViewMode}
        search={search}
        selectedAssetId={selectedAssetId}
        sort={sort}
        viewMode={viewMode}
        resolveAssetPreview={resolveAssetPreview}
      />
      {contextMenu ? (
        <FileManagerContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onCreateFolder={() => {
            openCreateDirectoryDialog();
          }}
          onCreateCsv={openCreateCsvDialog}
          onCreateTextFile={() => setIsTextDialogOpen(true)}
          onDelete={() => {
            if (contextMenu.asset) setDeleteTarget({ kind: "asset", value: contextMenu.asset });
          }}
          onMove={() => {
            if (contextMenu.asset) setMoveAsset(contextMenu.asset);
          }}
          onOpen={() => {
            if (contextMenu.asset) setContentAsset(contextMenu.asset);
          }}
          onProperties={() => {
            if (contextMenu.asset) setSelectedAssetId(contextMenu.asset.id);
          }}
          onRename={() => {
            if (contextMenu.asset) openRenameDialog(contextMenu.asset);
          }}
          onUpload={() => fileInputRef.current?.click()}
        />
      ) : null}
    </div>
  );

  const dialogs = (
    <>
      <CreateCsvDialog
        columns={csvColumns}
        delimiter={csvDelimiter}
        error={csvCreateError}
        filename={csvFileName}
        isSaving={isSaving}
        onClose={() => setIsCsvDialogOpen(false)}
        onColumnsChange={setCsvColumns}
        onCreate={() => void createCsvFile()}
        onDelimiterChange={setCsvDelimiter}
        onFilenameChange={setCsvFileName}
        open={isCsvDialogOpen}
      />
      <CreateFolderDialog
        error={error}
        isSaving={isSaving}
        name={folderName}
        onClose={() => {
          if (!isSaving) setIsCreateFolderOpen(false);
        }}
        onCreate={submitCreateDirectory}
        onNameChange={setFolderName}
        open={isCreateFolderOpen}
        parentName={currentDirectory?.name}
      />
      <RenameAssetDialog
        asset={renameTarget}
        isSaving={isSaving}
        name={renameName}
        onClose={() => setRenameTarget(null)}
        onNameChange={setRenameName}
        onRename={submitRename}
      />
      <ConfirmationDialog
        confirmLabel={deleteTarget?.kind === "directory" ? "Elimina cartella" : "Elimina media"}
        description={
          deleteTarget?.kind === "directory"
            ? `La cartella “${deleteTarget.value.name}” deve essere vuota per poter essere eliminata.`
            : deleteTarget
              ? `Vuoi eliminare “${deleteTarget.value.displayName}”?`
              : ""
        }
        isSaving={isSaving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind === "directory" ? "Eliminare la cartella?" : "Eliminare il media?"
        }
      />
      <TextFileDialog
        content={textFileContent}
        filename={textFileName}
        isSaving={isSaving}
        onClose={() => setIsTextDialogOpen(false)}
        onContentChange={setTextFileContent}
        onCreate={() => void createTextFile()}
        onFilenameChange={setTextFileName}
        open={isTextDialogOpen}
      />
      <MoveAssetDialog
        asset={moveAsset}
        directories={directories}
        isSaving={isSaving}
        onClose={() => setMoveAsset(null)}
        onMove={moveAssetTo}
      />
      <MediaContentDialog
        apiBaseUrl={apiBaseUrl}
        asset={contentAsset}
        cms={cms}
        onClose={() => setContentAsset(null)}
        onSave={replaceAssetContent}
      />
    </>
  );

  if (presentation === "modal") {
    return (
      <>
        <Dialog
          open={open}
          title={selectionMode === "single" ? "Seleziona un media" : "File manager"}
          description={
            selectionMode === "single"
              ? "Scegli un file dalla libreria media."
              : "Gestisci file, cartelle e condivisioni."
          }
          closeLabel="Chiudi"
          closeVariant="icon"
          onClose={onClose}
          width="fullscreen"
          footer={
            selectionMode === "single" ? (
              <div className="flex w-full items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Annulla
                </Button>
                <Button
                  type="button"
                  disabled={!selectedAsset}
                  isLoading={isSaving}
                  onClick={() => void selectAsset(selectedAsset)}
                >
                  {selectLabel}
                </Button>
              </div>
            ) : undefined
          }
        >
          {workspace}
        </Dialog>
        {dialogs}
      </>
    );
  }

  return (
    <>
      {workspace}
      {dialogs}
    </>
  );
}

/** Alias intended for consumers that embed the reusable Media file manager. */
export const FileManager = MediaFileManager;
