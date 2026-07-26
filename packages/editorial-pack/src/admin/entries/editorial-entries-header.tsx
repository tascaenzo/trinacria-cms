import { Button, DropdownMenu, DropdownMenuItem } from "@trinacria-cms/trinacria-ui";

export interface EditorialEntriesHeaderProps {
  canCreate: boolean;
  description: string;
  isLoading: boolean;
  onCreate: () => void;
  onRefresh: () => void;
  title: string;
}

export function EditorialEntriesHeader({
  canCreate,
  description,
  isLoading,
  onCreate,
  onRefresh,
  title
}: EditorialEntriesHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <span className="text-sm font-semibold leading-6 text-[color:var(--color-ink)]">
          {title}
        </span>
        <span className="text-xs font-normal leading-5 text-[color:var(--color-ink-muted)]">
          {description}
        </span>
      </div>
      <DropdownMenu
        align="end"
        trigger={
          <Button type="button" variant="secondary" size="sm">
            Azioni
          </Button>
        }
      >
        <DropdownMenuItem
          icon="refresh-cw"
          title="Aggiorna"
          disabled={isLoading}
          onClick={onRefresh}
        />
        <DropdownMenuItem
          icon="plus"
          title="Nuovo contenuto"
          disabled={!canCreate}
          onClick={onCreate}
        />
      </DropdownMenu>
    </div>
  );
}
