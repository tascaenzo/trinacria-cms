import { Badge, Button, Card, SelectableCard } from "@trinacria-cms/trinacria-ui";
import { EmptyState, ErrorBanner } from "../../components/resource-feedback.js";
import type { TranslateFn } from "../../lib/i18n.js";
import type { PluginSnapshot } from "./plugin-operations.types.js";
import { pluginStateTone } from "./plugin-operations-utils.js";

interface PluginInventoryProps {
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly plugins: readonly PluginSnapshot[];
  readonly selectedPluginId: string | null;
  readonly t: TranslateFn;
  readonly onRefresh: () => void;
  readonly onSelect: (pluginId: string) => void;
}

export function PluginInventory({
  error,
  isLoading,
  plugins,
  selectedPluginId,
  t,
  onRefresh,
  onSelect
}: PluginInventoryProps) {
  return (
    <Card eyebrow={t("plugins.inventory.eyebrow")} title={t("plugins.inventory.title")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--color-border)] pb-4">
        <p className="max-w-xl text-sm leading-6 text-[color:var(--color-ink-muted)]">
          {t("plugins.inventory.summary")}
        </p>
        <Button type="button" variant="secondary" onClick={onRefresh}>
          {t("common.actions.refresh")}
        </Button>
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {isLoading ? <EmptyState text={t("plugins.empty.loading")} /> : null}
      {!isLoading && plugins.length === 0 ? <EmptyState text={t("plugins.empty.none")} /> : null}

      <div className="grid gap-3">
        {plugins.map((plugin) => {
          const isSelected = plugin.id === selectedPluginId;
          return (
            <SelectableCard
              key={plugin.id}
              selected={isSelected}
              className="grid gap-3"
              onClick={() => onSelect(plugin.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[color:var(--color-ink)]">
                    {plugin.id}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
                    v{plugin.version} · {plugin.source?.type ?? t("plugins.table.source")}
                  </p>
                </div>
                <Badge tone={pluginStateTone(plugin.state)}>{plugin.state}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[color:var(--color-ink-muted)]">
                <span>
                  {plugin.capabilities.length} {t("plugins.table.capabilities").toLowerCase()}
                </span>
                <span>·</span>
                <span>
                  {plugin.dependencies.length} {t("plugins.table.dependencies").toLowerCase()}
                </span>
              </div>
            </SelectableCard>
          );
        })}
      </div>
    </Card>
  );
}
