import {
  Button,
  EmptyState,
  ErrorBanner,
  Icon,
  IconButton,
  PageHeader
} from "@trinacria-cms/trinacria-ui";
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
  description?: string;
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
  description,
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
  const hiddenItems = layout.hidden
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

  function moveWidget(key: string, delta: -1 | 1) {
    const currentIndex = visibleItems.findIndex((item) => item.key === key);
    const target = visibleItems[currentIndex + delta];
    if (target) {
      updateLayout((current) => reorderDashboardWidgets(current, key, target.key));
    }
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
      setIsEditing(false);
    }
  }

  function discardLayoutChanges() {
    setLayout(normalizeDashboardWidgetLayout(layoutValue, items));
    setIsDirty(false);
  }

  return (
    <section aria-label="Widget della dashboard" className="grid gap-5">
      {heading || canCustomize ? (
        <PageHeader
          className="border-b-0 pb-0"
          title={heading ?? "Dashboard"}
          description={description}
          actions={
            canCustomize ? (
              isEditing ? (
                <>
                  <Button variant="ghost" size="sm" disabled={isSaving} onClick={resetLayout}>
                    <Icon name="refresh-cw" />
                    Ripristina
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!isDirty || isSaving}
                    onClick={discardLayoutChanges}
                  >
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    disabled={!isDirty || isSaving || isLayoutLoading}
                    isLoading={isSaving}
                    onClick={() => void saveLayout()}
                  >
                    Salva
                  </Button>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon="x"
                    label="Esci dalla modifica dashboard"
                    aria-pressed={isEditing}
                    onClick={() => {
                      discardLayoutChanges();
                      setIsEditing(false);
                    }}
                  />
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isLayoutLoading}
                  onClick={() => setIsEditing(true)}
                >
                  <Icon name="settings-2" />
                  Personalizza
                </Button>
              )
            ) : undefined
          }
        />
      ) : null}

      {isEditing ? (
        <div className="flex items-start gap-3 border-y border-[color:var(--color-border)] py-3 text-sm leading-6 text-[color:var(--color-ink-muted)]">
          <Icon name="grip-vertical" className="mt-1 text-[color:var(--color-accent)]" />
          <p>Trascina i widget, modifica larghezza e altezza, quindi salva il layout condiviso.</p>
        </div>
      ) : null}
      {isEditing && hiddenItems.length ? (
        <div className="flex flex-col gap-3 border-b border-[color:var(--color-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[color:var(--color-ink)]">Widget nascosti</p>
            <p className="text-xs text-[color:var(--color-ink-muted)]">
              Riattiva solo gli elementi che vuoi mostrare.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hiddenItems.map((item) => (
              <Button
                key={item.key}
                variant="secondary"
                size="sm"
                onClick={() => toggleWidget(item.key, true)}
              >
                <Icon name="eye" />
                {item.title}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {isLayoutLoading ? (
        <p className="flex items-center gap-2 text-sm text-[color:var(--color-ink-muted)]">
          <Icon name="loader-circle" className="animate-spin" />
          Caricamento layout condiviso…
        </p>
      ) : null}
      {saveError ? <ErrorBanner message={saveError} /> : null}

      {visibleItems.length > 0 ? (
        <div className="grid auto-rows-[minmax(144px,auto)] gap-4 md:grid-cols-4">
          {visibleItems.map((item, index) => {
            const dimension = layout.dimensions[item.key];
            return (
              <section
                key={item.key}
                draggable={isEditing}
                aria-label={item.title}
                className={[
                  "min-w-0",
                  COLUMN_SPAN_CLASSES[dimension.columnSpan],
                  ROW_SPAN_CLASSES[dimension.rowSpan],
                  isEditing
                    ? "cursor-move overflow-hidden rounded-[var(--radius-surface)] border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-subtle)] p-2"
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
                  <div className="mb-2 flex flex-col justify-between gap-2 px-1 pb-2 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-[color:var(--color-ink-muted)]">
                      <Icon name="grip-vertical" className="text-[color:var(--color-accent)]" />
                      <span className="truncate">{item.title}</span>
                    </div>
                    <WidgetControls
                      dimension={dimension}
                      layout={item.layout}
                      moveDownDisabled={index === visibleItems.length - 1}
                      moveUpDisabled={index === 0}
                      onMoveDown={() => moveWidget(item.key, 1)}
                      onMoveUp={() => moveWidget(item.key, -1)}
                      onResize={(axis, delta) => updateDimension(item.key, axis, delta)}
                      onHide={() => toggleWidget(item.key, false)}
                    />
                  </div>
                ) : null}
                {item.content}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Nessun widget visibile"
          text="Ripristina il layout per tornare alla configurazione predefinita."
          action={
            canCustomize ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsEditing(true);
                  resetLayout();
                }}
              >
                Ripristina layout
              </Button>
            ) : undefined
          }
        />
      )}
    </section>
  );
}

function WidgetControls({
  dimension,
  layout,
  moveDownDisabled,
  moveUpDisabled,
  onHide,
  onMoveDown,
  onMoveUp,
  onResize
}: {
  dimension: DashboardWidgetDimension;
  layout?: DashboardWidgetLayoutDefinition;
  moveDownDisabled: boolean;
  moveUpDisabled: boolean;
  onHide: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onResize: (axis: keyof DashboardWidgetDimension, delta: number) => void;
}) {
  const minColumn = layout?.minColumnSpan ?? 1;
  const maxColumn = layout?.maxColumnSpan ?? 4;
  const minRow = layout?.minRowSpan ?? 1;
  const maxRow = layout?.maxRowSpan ?? 3;

  return (
    <div className="flex flex-wrap items-center gap-1 sm:justify-end">
      <span
        className="mr-1 text-[10px] font-medium tabular-nums text-[color:var(--color-ink-subtle)]"
        title="Dimensione attuale"
      >
        {dimension.columnSpan} × {dimension.rowSpan}
      </span>
      <div className="flex items-center border-l border-[color:var(--color-border)] pl-1 md:hidden">
        <IconButton
          variant="ghost"
          size="sm"
          icon="chevron-up"
          label="Sposta widget prima"
          disabled={moveUpDisabled}
          onClick={onMoveUp}
        />
        <IconButton
          variant="ghost"
          size="sm"
          icon="chevron-down"
          label="Sposta widget dopo"
          disabled={moveDownDisabled}
          onClick={onMoveDown}
        />
      </div>
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
      <IconButton
        variant="ghost"
        size="sm"
        icon="eye-off"
        label="Nascondi widget"
        onClick={onHide}
      />
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
    <div className="flex items-center border-l border-[color:var(--color-border)] pl-2">
      <span className="mr-1 text-[10px] font-semibold text-[color:var(--color-ink-subtle)]">
        {label}
      </span>
      <IconButton
        variant="ghost"
        size="sm"
        icon="minus"
        label={`Riduci ${label.toLowerCase()}`}
        disabled={decreaseDisabled}
        onClick={onDecrease}
      />
      <IconButton
        variant="ghost"
        size="sm"
        icon="plus"
        label={`Aumenta ${label.toLowerCase()}`}
        disabled={increaseDisabled}
        onClick={onIncrease}
      />
    </div>
  );
}
