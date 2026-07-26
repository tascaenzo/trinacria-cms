import { DropdownMenu, DropdownMenuItem, IconButton } from "@trinacria-cms/trinacria-ui";
import {
  type EditorialEntry,
  type EditorialEntryContentType,
  getEntryActions,
  type TransitionAction
} from "./entries.types.js";

export function EditorialEntryActionsMenu({
  contentType,
  entry,
  isActing,
  onEdit,
  onRevisions,
  onTransition
}: {
  contentType?: EditorialEntryContentType;
  entry: EditorialEntry;
  isActing: boolean;
  onEdit: () => void;
  onRevisions: () => void;
  onTransition: (entry: EditorialEntry, action: TransitionAction) => void;
}) {
  const transitions = getEntryActions(entry.status, contentType);
  return (
    <DropdownMenu
      align="end"
      contentClassName="min-w-[220px]"
      trigger={
        <IconButton
          icon="more-horizontal"
          label={`Azioni per ${entry.title ?? "contenuto senza titolo"}`}
          variant="secondary"
          size="sm"
          disabled={isActing}
        />
      }
    >
      <DropdownMenuItem icon="pencil" title="Modifica" onClick={onEdit} />
      <DropdownMenuItem icon="clock-3" title="Cronologia" onClick={onRevisions} />
      {transitions.map((action) => (
        <DropdownMenuItem
          key={action.id}
          icon={transitionIcon(action.id)}
          title={action.label}
          onClick={() => onTransition(entry, action)}
        />
      ))}
    </DropdownMenu>
  );
}

function transitionIcon(action: string) {
  if (action === "publish" || action === "approve") return "check" as const;
  if (action === "request_changes" || action === "unpublish") return "refresh-cw" as const;
  return "arrow-right" as const;
}
