import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, Dialog, Icon, Input, Select } from "@trinacria-cms/trinacria-ui";
import type { createCmsSdkClient } from "@trinacria-cms/sdk";
import {
  FileManagerContextMenu,
  type FileManagerContextMenuState
} from "./file-manager/file-manager-context-menu.js";
import {
  ConfirmationDialog,
  CreateCsvDialog,
  CreateFolderDialog,
  MoveAssetDialog,
  RenameAssetDialog,
  TextFileDialog,
  type CsvDelimiter
} from "./file-manager/file-manager-dialogs.js";
import { FileManagerFrame } from "./file-manager/file-manager-frame.js";
import type { FileManagerSort } from "./file-manager/file-manager-toolbar.js";
import { MediaContentDialog } from "./file-manager/media-content-dialog.js";
import { serializeCsv } from "./file-manager/csv-editor.js";

type CmsClient = ReturnType<typeof createCmsSdkClient>;
type Visibility = "private" | "restricted" | "public";
type PrincipalType = "user" | "role" | "plugin";
type ShareAction = "read" | "write" | "manage" | "share";

interface ApiEnvelope<T> {
  data: T;
}

interface MediaDirectory {
  id: string;
  parentId?: string;
  name: string;
  visibility: Visibility;
  inheritAcl: boolean;
}

interface MediaAsset {
  id: string;
  directoryId?: string;
  displayName: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  status: string;
  visibility: Visibility;
  updatedAt: string;
}

interface MediaShare {
  id: string;
  principalType: PrincipalType;
  principalId: string;
  actions: readonly ShareAction[];
  expiresAt?: string;
}

type DeleteTarget =
  | { kind: "asset"; value: MediaAsset }
  | { kind: "directory"; value: MediaDirectory };

export interface MediaFileManagerContext {
  cms: CmsClient;
  apiBaseUrl?: string;
  presentation?: "page" | "modal";
  open?: boolean;
  onClose?: () => void;
  t: (key: string, fallback?: string) => string;
}

const EMPTY_SHARE = {
  principalType: "role" as PrincipalType,
  principalId: "",
  actions: ["read"] as readonly ShareAction[],
  expiresAt: ""
};

export function MediaFileManager({
  apiBaseUrl = "/cms",
  cms,
  onClose = () => undefined,
  open = true,
  presentation = "page"
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
  const [message, setMessage] = useState<string | null>(null);
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
          (!query ||
            asset.displayName.toLowerCase().includes(query) ||
            asset.originalFilename.toLowerCase().includes(query) ||
            asset.mimeType.toLowerCase().includes(query))
      )
      .sort((left, right) => sortMediaItems(left, right, sort));
  }, [assets, search, sort]);
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

  useEffect(() => {
    void loadFileManager();
  }, [currentDirectoryId]);

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
      setError(toDisplayError(currentError));
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
      setMessage("Cartella creata.");
      await loadFileManager();
    } catch (currentError) {
      setError(toDisplayError(currentError));
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
      setMessage("Media aggiornato.");
      await loadFileManager();
    } catch (currentError) {
      setError(toDisplayError(currentError));
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
      setMessage("Media eliminato.");
      await loadFileManager();
    } catch (currentError) {
      setError(toDisplayError(currentError));
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
      setMessage("Cartella aggiornata.");
      await loadFileManager();
    } catch (currentError) {
      setError(toDisplayError(currentError));
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
      setMessage("Cartella eliminata.");
    } catch (currentError) {
      setError(toDisplayError(currentError));
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadFiles(files: FileList | readonly File[] | null): Promise<boolean> {
    if (!files?.length) return false;
    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);
      for (const file of Array.from(files)) {
        await transferFile(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage(files.length === 1 ? "Media caricato." : `${files.length} media caricati.`);
      await loadFileManager();
      return true;
    } catch (currentError) {
      setError(toDisplayError(currentError));
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
      setMessage("Contenuto salvato.");
      await loadFileManager();
      return true;
    } catch (currentError) {
      setError(toDisplayError(currentError));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function openContextMenu(event: React.MouseEvent<HTMLElement>, asset?: MediaAsset) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, ...(asset ? { asset } : {}) });
  }

  function openCreateDirectoryDialog() {
    setFolderName("");
    setIsCreateFolderOpen(true);
  }

  function submitCreateDirectory() {
    const name = folderName.trim();
    if (!name) return;
    setIsCreateFolderOpen(false);
    setFolderName("");
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
      setMessage("File CSV creato.");
      await loadFileManager();
      setContentAsset(created);
    } catch (currentError) {
      const nextError = toDisplayError(currentError);
      setCsvCreateError(nextError);
      setError(nextError);
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
    <div className="flex h-full min-h-60 items-center justify-center p-8 text-center text-sm leading-6 text-slate-500">
      Seleziona un file o una cartella per visualizzarne i dettagli.
    </div>
  );

  const workspace = (
    <div className="relative h-full" onClick={() => setContextMenu(null)}>
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
        message={message}
        onCreateFolder={openCreateDirectoryDialog}
        onCreateCsv={openCreateCsvDialog}
        onDetailsVisibleChange={setDetailsVisible}
        onNavigate={navigateToDirectory}
        onOpenAsset={setContentAsset}
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
        isSaving={isSaving}
        name={folderName}
        onClose={() => setIsCreateFolderOpen(false)}
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
          title="File manager"
          description="Gestisci file, cartelle e condivisioni."
          closeLabel="Chiudi"
          closeVariant="icon"
          onClose={onClose}
          width="fullscreen"
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

function DirectoryInspector({
  directory,
  directories,
  disabled,
  onDelete,
  onSave
}: {
  directory: MediaDirectory;
  directories: readonly MediaDirectory[];
  disabled: boolean;
  onDelete: () => void;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(directory.name);
  const [parentId, setParentId] = useState(directory.parentId ?? "");
  const [visibility, setVisibility] = useState<Visibility>(directory.visibility);
  const [inheritAcl, setInheritAcl] = useState(directory.inheritAcl);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    setName(directory.name);
    setParentId(directory.parentId ?? "");
    setVisibility(directory.visibility);
    setInheritAcl(directory.inheritAcl);
  }, [directory.id]);

  return (
    <div className="h-full overflow-auto p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Icon name="folder" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[color:var(--color-ink)]">
            {directory.name}
          </h2>
          <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">Impostazioni cartella</p>
        </div>
      </div>
      <CompactProperties
        items={[
          { label: "Visibilità", value: visibilityLabel(visibility) },
          {
            label: "Posizione",
            value: directory.parentId
              ? directoryPath(directory, directories).split(" / ").slice(0, -1).join(" / ") ||
                "Radice media"
              : "Radice media"
          },
          { label: "Permessi", value: directory.inheritAcl ? "Ereditati" : "Specifici" }
        ]}
      />
      <Button
        type="button"
        className="mt-5 w-full"
        variant="secondary"
        onClick={() => setIsEditOpen(true)}
      >
        <Icon name="pencil" className="h-4 w-4" /> Modifica cartella
      </Button>
      <Dialog
        open={isEditOpen}
        title="Modifica cartella"
        description={directory.name}
        closeLabel="Chiudi"
        closeVariant="icon"
        width="lg"
        onClose={() => setIsEditOpen(false)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              className="mr-auto text-[color:var(--color-danger-ink)]"
              disabled={disabled}
              onClick={onDelete}
            >
              Elimina cartella
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
              Annulla
            </Button>
            <Button
              type="button"
              disabled={disabled || !name.trim()}
              onClick={() => {
                onSave({
                  name: name.trim(),
                  visibility,
                  inheritAcl,
                  ...(parentId ? { parentId } : { clearParent: true })
                });
                setIsEditOpen(false);
              }}
            >
              Salva
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Input
            label="Nome cartella"
            value={name}
            readOnly={disabled}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <Select
            label="Cartella superiore"
            value={parentId}
            disabled={disabled}
            onChange={(event) => setParentId(event.currentTarget.value)}
          >
            <option value="">Radice media</option>
            {directories
              .filter((candidate) => candidate.id !== directory.id)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {directoryPath(candidate, directories)}
                </option>
              ))}
          </Select>
          <Select
            label="Visibilità"
            value={visibility}
            disabled={disabled}
            onChange={(event) => setVisibility(event.currentTarget.value as Visibility)}
          >
            <option value="private">Privata</option>
            <option value="restricted">Con restrizioni</option>
            <option value="public">Pubblica</option>
          </Select>
          <Checkbox
            label="Eredita le regole di condivisione"
            description="Applica anche a questa cartella le condivisioni definite nella gerarchia superiore."
            checked={inheritAcl}
            disabled={disabled}
            onChange={(event) => setInheritAcl(event.currentTarget.checked)}
          />
        </div>
      </Dialog>
    </div>
  );
}

function AssetInspector({
  asset,
  apiBaseUrl,
  directories,
  cms,
  disabled,
  onDelete,
  onSave,
  onChanged,
  onOpenContent
}: {
  asset: MediaAsset;
  apiBaseUrl: string;
  directories: readonly MediaDirectory[];
  cms: CmsClient;
  disabled: boolean;
  onDelete: () => void;
  onSave: (body: Record<string, unknown>) => void;
  onChanged: () => void;
  onOpenContent: () => void;
}) {
  const [displayName, setDisplayName] = useState(asset.displayName);
  const [directoryId, setDirectoryId] = useState(asset.directoryId ?? "");
  const [visibility, setVisibility] = useState<Visibility>(asset.visibility);
  const [shares, setShares] = useState<readonly MediaShare[]>([]);
  const [share, setShare] = useState(EMPTY_SHARE);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [shareToRevoke, setShareToRevoke] = useState<MediaShare | null>(null);

  useEffect(() => {
    setDisplayName(asset.displayName);
    setDirectoryId(asset.directoryId ?? "");
    setVisibility(asset.visibility);
    setIsEditOpen(false);
    void loadShares();
  }, [asset.id]);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    setPreviewError(null);
    setIsLoadingPreview(true);
    void cms
      .request<ApiEnvelope<{ url: string }>>({
        method: "POST",
        path: `/v1/media/assets/${encodeURIComponent(asset.id)}/access-url`
      })
      .then((response) => {
        if (!cancelled) setPreviewUrl(resolveUploadUrl(response.data.url, apiBaseUrl));
      })
      .catch((error) => {
        if (!cancelled) setPreviewError(toDisplayError(error));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, asset.id, cms]);

  async function loadShares() {
    try {
      setIsLoadingShares(true);
      setShareError(null);
      const response = await cms.request<ApiEnvelope<readonly MediaShare[]>>({
        method: "GET",
        path: `/v1/media/assets/${encodeURIComponent(asset.id)}/shares`
      });
      setShares(response.data);
    } catch (error) {
      setShareError(toDisplayError(error));
    } finally {
      setIsLoadingShares(false);
    }
  }

  async function addShare() {
    const principalId = share.principalId.trim();
    if (!principalId) {
      setShareError("Indica un utente, un ruolo o un servizio.");
      return;
    }
    if (share.actions.length === 0) {
      setShareError("Seleziona almeno un permesso.");
      return;
    }
    try {
      setIsLoadingShares(true);
      setShareError(null);
      await cms.request<ApiEnvelope<readonly MediaShare[]>>({
        method: "PUT",
        path: `/v1/media/assets/${encodeURIComponent(asset.id)}/shares`,
        body: {
          grants: [
            {
              principalType: share.principalType,
              principalId,
              actions: share.actions,
              ...(share.expiresAt
                ? { expiresAt: new Date(`${share.expiresAt}T23:59:59`).toISOString() }
                : {})
            }
          ]
        }
      });
      setShare(EMPTY_SHARE);
      await loadShares();
      onChanged();
    } catch (error) {
      setShareError(toDisplayError(error));
    } finally {
      setIsLoadingShares(false);
    }
  }

  async function revokeShare(entry: MediaShare) {
    try {
      setIsLoadingShares(true);
      setShareError(null);
      await cms.request<ApiEnvelope<{ deleted: boolean }>>({
        method: "DELETE",
        path: `/v1/media/assets/${encodeURIComponent(asset.id)}/shares/${encodeURIComponent(entry.id)}`
      });
      await loadShares();
      onChanged();
      setShareToRevoke(null);
    } catch (error) {
      setShareError(toDisplayError(error));
    } finally {
      setIsLoadingShares(false);
    }
  }

  function toggleShareAction(action: ShareAction) {
    setShare((current) => ({
      ...current,
      actions: current.actions.includes(action)
        ? current.actions.filter((entry) => entry !== action)
        : [...current.actions, action]
    }));
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="flex items-start gap-3">
        <InspectorMediaGlyph mimeType={asset.mimeType} />
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[color:var(--color-ink)]">
            {asset.displayName}
          </h2>
          <p className="mt-1 truncate text-xs text-[color:var(--color-ink-muted)]">
            {asset.originalFilename}
          </p>
        </div>
      </div>
      <PreviewSurface
        asset={asset}
        error={previewError}
        isLoading={isLoadingPreview}
        url={previewUrl}
      />
      <CompactProperties
        items={[
          { label: "Tipo", value: asset.mimeType },
          { label: "Dimensione", value: formatBytes(asset.byteSize) },
          { label: "Visibilità", value: visibilityLabel(asset.visibility) },
          { label: "Modificato", value: formatDate(asset.updatedAt) }
        ]}
      />
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={onOpenContent}>
          <Icon name="eye" className="h-4 w-4" /> Visualizza
        </Button>
        <Button type="button" onClick={() => setIsEditOpen(true)}>
          <Icon name="pencil" className="h-4 w-4" /> Proprietà
        </Button>
      </div>

      <Dialog
        open={isEditOpen}
        title="Modifica media"
        description={asset.displayName}
        closeLabel="Chiudi"
        closeVariant="icon"
        width="xl"
        onClose={() => setIsEditOpen(false)}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              className="mr-auto text-[color:var(--color-danger-ink)]"
              disabled={disabled}
              onClick={onDelete}
            >
              Elimina media
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
              Annulla
            </Button>
            <Button
              type="button"
              disabled={disabled || !displayName.trim()}
              onClick={() => {
                onSave({
                  displayName: displayName.trim(),
                  visibility,
                  ...(directoryId ? { directoryId } : { clearDirectory: true })
                });
                setIsEditOpen(false);
              }}
            >
              Salva modifiche
            </Button>
          </>
        }
      >
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(340px,1.15fr)]">
          <section className="grid content-start gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">Proprietà</h3>
              <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                Nome, posizione e accesso generale.
              </p>
            </div>
            <Input
              label="Nome"
              value={displayName}
              readOnly={disabled}
              onChange={(event) => setDisplayName(event.currentTarget.value)}
            />
            <Select
              label="Cartella"
              value={directoryId}
              disabled={disabled}
              onChange={(event) => setDirectoryId(event.currentTarget.value)}
            >
              <option value="">Tutti i media</option>
              {directories.map((directory) => (
                <option key={directory.id} value={directory.id}>
                  {directoryPath(directory, directories)}
                </option>
              ))}
            </Select>
            <Select
              label="Visibilità"
              value={visibility}
              disabled={disabled}
              onChange={(event) => setVisibility(event.currentTarget.value as Visibility)}
            >
              <option value="private">Privato</option>
              <option value="restricted">Con restrizioni</option>
              <option value="public">Pubblico</option>
            </Select>
          </section>
          <section className="grid min-w-0 content-start gap-4 border-t border-[color:var(--color-border)] pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <div>
              <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">Condivisioni</h3>
              <p className="mt-1 text-xs leading-5 text-[color:var(--color-ink-muted)]">
                Concedi accesso mirato a utenti, ruoli o servizi.
              </p>
            </div>
            {shareError ? (
              <p className="break-words text-sm text-[color:var(--color-danger-ink)]">
                {shareError}
              </p>
            ) : null}
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Select
                label="Destinatario"
                value={share.principalType}
                disabled={disabled || isLoadingShares}
                onChange={(event) =>
                  setShare((current) => ({
                    ...current,
                    principalType: event.currentTarget.value as PrincipalType
                  }))
                }
              >
                <option value="role">Ruolo</option>
                <option value="user">Utente (ID)</option>
                <option value="plugin">Servizio</option>
              </Select>
              <Input
                label={
                  share.principalType === "role"
                    ? "Codice ruolo"
                    : share.principalType === "user"
                      ? "ID utente"
                      : "ID servizio"
                }
                value={share.principalId}
                readOnly={disabled || isLoadingShares}
                onChange={(event) =>
                  setShare((current) => ({ ...current, principalId: event.currentTarget.value }))
                }
              />
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {(["read", "write", "manage", "share"] as const).map((action) => (
                <Checkbox
                  key={action}
                  label={shareActionLabel(action)}
                  checked={share.actions.includes(action)}
                  disabled={disabled || isLoadingShares}
                  onChange={() => toggleShareAction(action)}
                />
              ))}
            </div>
            <div className="grid min-w-0 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                label="Scadenza (facoltativa)"
                type="date"
                value={share.expiresAt}
                readOnly={disabled || isLoadingShares}
                onChange={(event) =>
                  setShare((current) => ({ ...current, expiresAt: event.currentTarget.value }))
                }
              />
              <Button
                type="button"
                variant="secondary"
                disabled={disabled || isLoadingShares}
                onClick={() => void addShare()}
              >
                Aggiungi
              </Button>
            </div>
            <div className="grid max-h-48 min-w-0 gap-2 overflow-auto">
              {isLoadingShares ? (
                <p className="text-xs text-[color:var(--color-ink-muted)]">Caricamento regole…</p>
              ) : null}
              {shares.length === 0 && !isLoadingShares ? (
                <p className="rounded-md border border-dashed border-[color:var(--color-border)] p-3 text-xs text-[color:var(--color-ink-muted)]">
                  Nessuna condivisione specifica.
                </p>
              ) : null}
              {shares.map((entry) => (
                <div
                  key={entry.id}
                  className="min-w-0 rounded-md border border-[color:var(--color-border)] p-3 text-xs text-[color:var(--color-ink-muted)]"
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-[color:var(--color-ink)]">
                        {entry.principalType}: {entry.principalId}
                      </p>
                      <p className="mt-1 break-words">
                        {entry.actions.map(shareActionLabel).join(", ")}
                        {entry.expiresAt ? ` · fino al ${formatDate(entry.expiresAt)}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={disabled || isLoadingShares}
                      className="shrink-0 text-[color:var(--color-danger-ink)] hover:underline"
                      onClick={() => setShareToRevoke(entry)}
                    >
                      Revoca
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Dialog>
      <ConfirmationDialog
        confirmLabel="Revoca accesso"
        description={
          shareToRevoke
            ? `Revocare l’accesso per ${shareToRevoke.principalType}: ${shareToRevoke.principalId}?`
            : ""
        }
        isSaving={isLoadingShares}
        onClose={() => setShareToRevoke(null)}
        onConfirm={() => {
          if (shareToRevoke) void revokeShare(shareToRevoke);
        }}
        open={shareToRevoke !== null}
        title="Revocare la condivisione?"
      />
    </div>
  );
}

function PreviewSurface({
  asset,
  error,
  isLoading,
  url
}: {
  asset: MediaAsset;
  error: string | null;
  isLoading: boolean;
  url: string | null;
}) {
  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <div className="grid h-full place-items-center text-xs text-[color:var(--color-ink-muted)]">
        Caricamento anteprima…
      </div>
    );
  } else if (!url || error) {
    content = (
      <div className="grid h-full place-items-center p-5 text-center">
        <div>
          <InspectorMediaGlyph mimeType={asset.mimeType} />
          <p className="mt-3 text-xs text-[color:var(--color-ink-muted)]">
            {error ?? "Anteprima non disponibile"}
          </p>
        </div>
      </div>
    );
  } else if (asset.mimeType.startsWith("image/")) {
    content = <img src={url} alt={asset.displayName} className="h-full w-full object-contain" />;
  } else if (asset.mimeType.startsWith("video/")) {
    content = (
      <video src={url} controls preload="metadata" className="h-full w-full object-contain" />
    );
  } else if (asset.mimeType.startsWith("audio/")) {
    content = (
      <div className="grid h-full place-items-center p-5">
        <audio src={url} controls preload="metadata" className="w-full" />
      </div>
    );
  } else if (asset.mimeType === "application/pdf" || asset.mimeType.startsWith("text/")) {
    content = (
      <iframe
        src={url}
        title={`Anteprima di ${asset.displayName}`}
        className="h-full w-full border-0 bg-white"
      />
    );
  } else {
    content = (
      <div className="grid h-full place-items-center p-5 text-center">
        <div>
          <InspectorMediaGlyph mimeType={asset.mimeType} />
          <p className="mt-3 text-xs text-[color:var(--color-ink-muted)]">
            Anteprima non disponibile per questo formato.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-5 h-44 overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)]">
      {content}
    </div>
  );
}

function CompactProperties({ items }: { items: readonly { label: string; value: string }[] }) {
  return (
    <dl className="mt-5 divide-y divide-[color:var(--color-border)] rounded-md border border-[color:var(--color-border)]">
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 px-3 py-2.5">
          <dt className="text-xs text-[color:var(--color-ink-muted)]">{item.label}</dt>
          <dd
            className="min-w-0 truncate text-right text-xs font-medium text-[color:var(--color-ink)]"
            title={item.value}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function buildBreadcrumbs(directoryId: string | null, directories: readonly MediaDirectory[]) {
  const result: MediaDirectory[] = [];
  let current = directories.find((directory) => directory.id === directoryId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    result.unshift(current);
    current = directories.find((directory) => directory.id === current?.parentId);
  }
  return result;
}
function sortMediaItems(
  left: MediaDirectory | MediaAsset,
  right: MediaDirectory | MediaAsset,
  sort: FileManagerSort
) {
  const fallback = () =>
    mediaItemName(left).localeCompare(mediaItemName(right), "it", { sensitivity: "base" });
  if (sort === "updated")
    return (
      ("updatedAt" in right ? Date.parse(right.updatedAt) || 0 : 0) -
        ("updatedAt" in left ? Date.parse(left.updatedAt) || 0 : 0) || fallback()
    );
  if (sort === "size")
    return (
      ("byteSize" in right ? right.byteSize : 0) - ("byteSize" in left ? left.byteSize : 0) ||
      fallback()
    );
  return fallback();
}
function mediaItemName(item: MediaDirectory | MediaAsset) {
  return "displayName" in item ? item.displayName : item.name;
}
function InspectorMediaGlyph({ mimeType }: { mimeType: string }) {
  const isImage = mimeType.startsWith("image/");
  return (
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-xl ${isImage ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}
    >
      <Icon
        name={isImage ? "image" : mimeType === "application/pdf" ? "file-text" : "file"}
        className="h-5 w-5"
      />
    </span>
  );
}
function directoryPath(directory: MediaDirectory, directories: readonly MediaDirectory[]) {
  return buildBreadcrumbs(directory.id, directories)
    .map((entry) => entry.name)
    .join(" / ");
}
function formatBytes(value: number) {
  if (value < 1_000_000) return `${Math.max(1, Math.round(value / 1_000))} KB`;
  return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} MB`;
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(date);
}
function visibilityLabel(value: Visibility) {
  return value === "public" ? "Pubblica" : value === "restricted" ? "Con restrizioni" : "Privata";
}
function shareActionLabel(value: ShareAction) {
  return value === "read"
    ? "Leggere"
    : value === "write"
      ? "Modificare"
      : value === "manage"
        ? "Gestire"
        : "Condividere";
}
interface StartedUpload {
  session: { id: string };
  upload: {
    method: "proxy" | "presigned";
    uploadUrl: string;
    requiredHeaders?: Readonly<Record<string, string>>;
  };
}

function resolveUploadUrl(uploadUrl: string, apiBaseUrl: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(uploadUrl)) return uploadUrl;
  const normalizedBase = apiBaseUrl.replace(/\/$/, "");
  return `${normalizedBase}${uploadUrl.startsWith("/") ? uploadUrl : `/${uploadUrl}`}`;
}

async function sha256(file: File): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error("Il browser non supporta il controllo di integrità dei file.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toDisplayError(error: unknown) {
  return error instanceof Error ? error.message : "Operazione media non riuscita.";
}
