import {
  Button,
  Checkbox,
  Dialog,
  EmptyState,
  Icon,
  IconTile,
  Input,
  Panel,
  PropertyItem,
  PropertyList,
  Select
} from "@trinacria-cms/trinacria-ui";
import { useEffect, useEffectEvent, useState } from "react";
import type {
  ApiEnvelope,
  CmsClient,
  MediaAsset,
  MediaDirectory,
  MediaShare,
  PrincipalType,
  ShareAction,
  Visibility
} from "./file-manager.types.js";
import {
  directoryPath,
  formatBytes,
  formatDate,
  resolveUploadUrl,
  shareActionLabel,
  toDisplayError,
  visibilityLabel
} from "./file-manager.utils.js";
import { ConfirmationDialog } from "./file-manager-dialogs.js";

const EMPTY_SHARE = {
  principalType: "role" as PrincipalType,
  principalId: "",
  actions: ["read"] as readonly ShareAction[],
  expiresAt: ""
};

export function DirectoryInspector({
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
  }, [directory.inheritAcl, directory.name, directory.parentId, directory.visibility]);

  return (
    <div className="h-full overflow-auto p-5">
      <div className="flex items-start gap-3">
        <IconTile icon="folder" tone="warning" />
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

export function AssetInspector({
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

  const loadSharesEffect = useEffectEvent(() => loadShares());
  useEffect(() => {
    setDisplayName(asset.displayName);
    setDirectoryId(asset.directoryId ?? "");
    setVisibility(asset.visibility);
    setIsEditOpen(false);
    void loadSharesEffect();
  }, [asset.directoryId, asset.displayName, asset.visibility]);

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
              Salva
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
                <EmptyState className="p-3" text="Nessuna condivisione specifica." />
              ) : null}
              {shares.map((entry) => (
                <Panel
                  key={entry.id}
                  className="min-w-0 p-3 text-xs text-[color:var(--color-ink-muted)]"
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
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={disabled || isLoadingShares}
                      className="shrink-0 text-[color:var(--color-danger-ink)]"
                      onClick={() => setShareToRevoke(entry)}
                    >
                      Revoca
                    </Button>
                  </div>
                </Panel>
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
    <Panel className="mt-5 h-44 overflow-hidden p-0" tone="soft">
      {content}
    </Panel>
  );
}

function CompactProperties({ items }: { items: readonly { label: string; value: string }[] }) {
  return (
    <PropertyList className="mt-5" variant="linear">
      {items.map((item) => (
        <PropertyItem key={item.label} label={item.label} value={item.value} />
      ))}
    </PropertyList>
  );
}

function InspectorMediaGlyph({ mimeType }: { mimeType: string }) {
  const isImage = mimeType.startsWith("image/");
  return (
    <IconTile
      tone={isImage ? "info" : "neutral"}
      icon={isImage ? "image" : mimeType === "application/pdf" ? "file-text" : "file"}
    />
  );
}
