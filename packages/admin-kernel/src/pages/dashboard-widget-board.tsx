import { Button, Icon } from "@trinacria-cms/trinacria-ui";
import { type DragEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  type DashboardWidgetDimension,
  type DashboardWidgetLayoutDefinition,
  type DashboardWidgetLayoutItem,
  type DashboardWidgetLayoutState,
  normalizeDashboardWidgetLayout,
  reorderDashboardWidgets
} from "./dashboard-widget-board.storage.js";

export interface DashboardWidgetBoardItem extends DashboardWidgetLayoutItem {
  pluginId: string;
  title: string;
  content: ReactNode;
}

export interface DashboardWidgetBoardProps {
  canCustomize?: boolean;
  heading?: string;
  isLayoutLoading?: boolean;
  isSaving?: boolean;
  items: readonly DashboardWidgetBoardItem[];
  layoutValue?: unknown;
  layoutVersion?: number;
  onSaveLayout?: (layout: DashboardWidgetLayoutState) => Promise<boolean>;
  saveError?: string | null;
}

const COLUMN_SPAN_CLASSES = [
  "",
  "md:col-span-1",
  "md:col-span-2",
  "md:col-span-3",
  "md:col-span-4"
];
const ROW_SPAN_CLASSES = ["", "md:row-span-1", "md:row-span-2", "md:row-span-3"];

/**
 * A plugin-neutral dashboard board. Plugin manifests provide the available
 * widgets and initial constraints; the global layout is stored in CMS settings.
 */
export function DashboardWidgetBoard({
  canCustomize = false,
  heading,
  isLayoutLoading = false,
  isSaving = false,
  items,
  layoutValue,
  layoutVersion = 0,
  onSaveLayout,
  saveError
}: DashboardWidgetBoardProps) {
  const widgetSignature = items
    .map((item) => `${item.key}:${JSON.stringify(item.layout ?? {})}`)
    .join("|");
  const [layout, setLayout] = useState<DashboardWidgetLayoutState>(() =>
    normalizeDashboardWidgetLayout(layoutValue, items)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  useEffect(() => {
    setLayout((previous) => normalizeDashboardWidgetLayout(previous, items));
  }, [items, widgetSignature]);

  useEffect(() => {
    setLayout(normalizeDashboardWidgetLayout(layoutValue, items));
    setIsDirty(false);
  }, [items, layoutValue, layoutVersion, widgetSignature]);

  useEffect(() => {
    if (!canCustomize) {
      setIsEditing(false);
    }
  }, [canCustomize]);

  const itemByKey = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);
  const visibleItems = layout.order
    .filter((key) => !layout.hidden.includes(key))
    .map((key) => itemByKey.get(key))
    .filter((item): item is DashboardWidgetBoardItem => Boolean(item));

  function updateLayout(
    updater: (current: DashboardWidgetLayoutState) => DashboardWidgetLayoutState
  ) {
    setLayout((current) => normalizeDashboardWidgetLayout(updater(current), items));
    setIsDirty(true);
  }

  function toggleWidget(key: string, isVisible: boolean) {
    updateLayout((current) => ({
      ...current,
      hidden: isVisible
        ? current.hidden.filter((hiddenKey) => hiddenKey !== key)
        : [...current.hidden, key]
    }));
  }

  function updateDimension(key: string, axis: keyof DashboardWidgetDimension, delta: number) {
    updateLayout((current) => {
      const dimension = current.dimensions[key];
      return {
        ...current,
        dimensions: {
          ...current.dimensions,
          [key]: {
            ...dimension,
            [axis]: dimension[axis] + delta
          }
        }
      };
    });
  }

  function handleDragStart(event: DragEvent<HTMLElement>, key: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
    setDraggedKey(key);
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetKey: string) {
    event.preventDefault();
    const sourceKey = event.dataTransfer.getData("text/plain") || draggedKey;
    if (sourceKey) {
      updateLayout((current) => reorderDashboardWidgets(current, sourceKey, targetKey));
    }
    setDraggedKey(null);
  }

  function resetLayout() {
    updateLayout(() => normalizeDashboardWidgetLayout(undefined, items));
  }

  async function saveLayout() {
    if (!onSaveLayout) return;
    if (await onSaveLayout(layout)) {
      setIsDirty(false);
    }
  }

  function discardLayoutChanges() {
    setLayout(normalizeDashboardWidgetLayout(layoutValue, items));
    setIsDirty(false);
  }

  return (
    <section aria-label="Plugin widgets" className="grid gap-3">
      {heading || canCustomize ? (
        <div className="flex items-center justify-between gap-3">
          {heading ? (
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">
              {heading}
            </h2>
          ) : (
            <span />
          )}
          {canCustomize ? (
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!isDirty || isSaving || isLayoutLoading}
                    isLoading={isSaving}
                    onClick={() => void saveLayout()}
                  >
                    Salva
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!isDirty || isSaving}
                    onClick={discardLayoutChanges}
                  >
                    Annulla
                  </Button>
                </>
              ) : null}
              {isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label="Ripristina layout dashboard"
                  title="Ripristina layout"
                  onClick={resetLayout}
                >
                  <Icon name="refresh-cw" />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={
                  isEditing ? "Esci dalla modifica dashboard" : "Modifica layout dashboard"
                }
                title={isEditing ? "Fine modifica" : "Modifica layout"}
                aria-pressed={isEditing}
                disabled={isLayoutLoading}
                onClick={() => setIsEditing((current) => !current)}
              >
                <Icon name={isEditing ? "x" : "settings-2"} />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {isEditing ? (
        <div className="rounded-lg border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-subtle)] px-3 py-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
          Trascina i widget dalla maniglia. Usa i controlli sul widget per modificarne larghezza,
          altezza o visibilità, poi salva per applicare il layout a tutti gli utenti.
        </div>
      ) : null}
      {isLayoutLoading ? (
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Caricamento layout condiviso...
        </p>
      ) : null}
      {saveError ? (
        <p className="text-sm font-medium text-[color:var(--color-danger-ink)]">{saveError}</p>
      ) : null}

      {visibleItems.length > 0 ? (
        <div className="grid auto-rows-[minmax(144px,auto)] gap-4 md:grid-cols-4">
          {visibleItems.map((item) => {
            const dimension = layout.dimensions[item.key];
            return (
              <section
                key={item.key}
                draggable={isEditing}
                aria-label={item.title}
                className={[
                  "relative min-w-0",
                  COLUMN_SPAN_CLASSES[dimension.columnSpan],
                  ROW_SPAN_CLASSES[dimension.rowSpan],
                  isEditing
                    ? "cursor-move rounded-xl bg-[color:var(--color-surface-subtle)] p-1 outline outline-1 outline-dashed outline-[color:var(--color-border-strong)]"
                    : "",
                  draggedKey === item.key ? "opacity-45" : ""
                ].join(" ")}
                onDragStart={(event) => handleDragStart(event, item.key)}
                onDragEnd={() => setDraggedKey(null)}
                onDragOver={(event) => {
                  if (isEditing) event.preventDefault();
                }}
                onDrop={(event) => handleDrop(event, item.key)}
              >
                {isEditing ? (
                  <span
                    title="Trascina questo widget per cambiarne posizione"
                    className="absolute left-3 top-3 z-10 flex h-7 items-center gap-1 rounded-md bg-[color:var(--color-surface)] px-2 text-xs font-medium text-[color:var(--color-ink-muted)] shadow-[var(--shadow-surface)]"
                  >
                    <Icon name="grip-vertical" />
                    Trascina
                  </span>
                ) : null}
                {isEditing ? (
                  <WidgetControls
                    dimension={dimension}
                    layout={item.layout}
                    onResize={(axis, delta) => updateDimension(item.key, axis, delta)}
                    onHide={() => toggleWidget(item.key, false)}
                  />
                ) : null}
                {item.content}
              </section>
            );
          })}
        </div>
      ) : (
        <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">
          Nessun widget è visibile. Ripristina il layout dalle impostazioni.
        </p>
      )}
    </section>
  );
}

function WidgetControls({
  dimension,
  layout,
  onHide,
  onResize
}: {
  dimension: DashboardWidgetDimension;
  layout?: DashboardWidgetLayoutDefinition;
  onHide: () => void;
  onResize: (axis: keyof DashboardWidgetDimension, delta: number) => void;
}) {
  const minColumn = layout?.minColumnSpan ?? 1;
  const maxColumn = layout?.maxColumnSpan ?? 4;
  const minRow = layout?.minRowSpan ?? 1;
  const maxRow = layout?.maxRowSpan ?? 3;

  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-1 shadow-[var(--shadow-surface)]">
      <span
        className="px-1 text-[10px] font-medium tabular-nums text-[color:var(--color-ink-subtle)]"
        title="Dimensione attuale"
      >
        {dimension.columnSpan} × {dimension.rowSpan}
      </span>
      <ControlPair
        label="Larghezza"
        decreaseDisabled={dimension.columnSpan <= Math.min(minColumn, maxColumn)}
        increaseDisabled={dimension.columnSpan >= Math.max(minColumn, maxColumn)}
        onDecrease={() => onResize("columnSpan", -1)}
        onIncrease={() => onResize("columnSpan", 1)}
      />
      <ControlPair
        label="Altezza"
        decreaseDisabled={dimension.rowSpan <= Math.min(minRow, maxRow)}
        increaseDisabled={dimension.rowSpan >= Math.max(minRow, maxRow)}
        onDecrease={() => onResize("rowSpan", -1)}
        onIncrease={() => onResize("rowSpan", 1)}
      />
      <ControlButton label="Nascondi widget" onClick={onHide}>
        <Icon name="eye-off" />
      </ControlButton>
    </div>
  );
}

function ControlPair({
  decreaseDisabled,
  increaseDisabled,
  label,
  onDecrease,
  onIncrease
}: {
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
  label: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex items-center border-l border-[color:var(--color-border)] pl-1">
      <span className="mr-1 text-[10px] font-semibold text-[color:var(--color-ink-subtle)]">
        {label}
      </span>
      <ControlButton
        label={`Riduci ${label.toLowerCase()}`}
        disabled={decreaseDisabled}
        onClick={onDecrease}
      >
        <Icon name="minus" className="h-3 w-3" />
      </ControlButton>
      <ControlButton
        label={`Aumenta ${label.toLowerCase()}`}
        disabled={increaseDisabled}
        onClick={onIncrease}
      >
        <Icon name="plus" className="h-3 w-3" />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  disabled,
  label,
  onClick
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-surface-subtle)] hover:text-[color:var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-35"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
