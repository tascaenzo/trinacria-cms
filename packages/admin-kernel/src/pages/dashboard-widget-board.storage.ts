export type DashboardWidgetColumnSpan = 1 | 2 | 3 | 4;
export type DashboardWidgetRowSpan = 1 | 2 | 3;

export interface DashboardWidgetDimension {
  columnSpan: DashboardWidgetColumnSpan;
  rowSpan: DashboardWidgetRowSpan;
}

export interface DashboardWidgetLayoutDefinition {
  defaultColumnSpan?: DashboardWidgetColumnSpan;
  defaultRowSpan?: DashboardWidgetRowSpan;
  columnSpan?: DashboardWidgetColumnSpan;
  rowSpan?: DashboardWidgetRowSpan;
  minColumnSpan?: DashboardWidgetColumnSpan;
  maxColumnSpan?: DashboardWidgetColumnSpan;
  minRowSpan?: DashboardWidgetRowSpan;
  maxRowSpan?: DashboardWidgetRowSpan;
}

export interface DashboardWidgetLayoutItem {
  key: string;
  layout?: DashboardWidgetLayoutDefinition;
}

export interface DashboardWidgetLayoutState {
  order: readonly string[];
  hidden: readonly string[];
  dimensions: Readonly<Record<string, DashboardWidgetDimension>>;
}

/** Global CMS setting shared by every backoffice operator. */
export const GLOBAL_DASHBOARD_WIDGET_LAYOUT_SETTING_KEY = "core-pack:dashboard:widget_layout";

/**
 * Removes obsolete plugin widgets, appends newly discovered ones, and clamps
 * the globally stored sizes to the limits currently declared by their owner plugin.
 */
export function normalizeDashboardWidgetLayout(
  value: unknown,
  items: readonly DashboardWidgetLayoutItem[]
): DashboardWidgetLayoutState {
  const itemByKey = new Map(items.map((item) => [item.key, item]));
  const raw = isRecord(value) ? value : {};
  const requestedOrder = readStringArray(raw.order);
  const order = dedupe(requestedOrder.filter((key) => itemByKey.has(key)));
  for (const item of items) {
    if (!order.includes(item.key)) {
      order.push(item.key);
    }
  }

  const hidden = dedupe(readStringArray(raw.hidden).filter((key) => itemByKey.has(key)));
  const rawDimensions = isRecord(raw.dimensions) ? raw.dimensions : {};
  const dimensions: Record<string, DashboardWidgetDimension> = {};

  for (const item of items) {
    const storedDimension = rawDimensions[item.key];
    const current = isRecord(storedDimension) ? storedDimension : {};
    dimensions[item.key] = {
      columnSpan: clampColumnSpan(current.columnSpan, item.layout),
      rowSpan: clampRowSpan(current.rowSpan, item.layout)
    };
  }

  return { order, hidden, dimensions };
}

export function reorderDashboardWidgets(
  layout: DashboardWidgetLayoutState,
  sourceKey: string,
  targetKey: string
): DashboardWidgetLayoutState {
  if (sourceKey === targetKey) {
    return layout;
  }

  const visibleOrder = layout.order.filter((key) => !layout.hidden.includes(key));
  const sourceIndex = visibleOrder.indexOf(sourceKey);
  const targetIndex = visibleOrder.indexOf(targetKey);
  if (sourceIndex < 0 || targetIndex < 0) {
    return layout;
  }

  visibleOrder.splice(sourceIndex, 1);
  visibleOrder.splice(targetIndex, 0, sourceKey);
  const hiddenOrder = layout.order.filter((key) => layout.hidden.includes(key));
  return { ...layout, order: [...visibleOrder, ...hiddenOrder] };
}

function clampColumnSpan(
  value: unknown,
  layout: DashboardWidgetLayoutDefinition | undefined
): DashboardWidgetColumnSpan {
  const min = layout?.minColumnSpan ?? 1;
  const max = layout?.maxColumnSpan ?? 4;
  const fallback = layout?.defaultColumnSpan ?? layout?.columnSpan ?? 1;
  return clamp(value, min, max, fallback) as DashboardWidgetColumnSpan;
}

function clampRowSpan(
  value: unknown,
  layout: DashboardWidgetLayoutDefinition | undefined
): DashboardWidgetRowSpan {
  const min = layout?.minRowSpan ?? 1;
  const max = layout?.maxRowSpan ?? 3;
  const fallback = layout?.defaultRowSpan ?? layout?.rowSpan ?? 1;
  return clamp(value, min, max, fallback) as DashboardWidgetRowSpan;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const numeric = typeof value === "number" && Number.isInteger(value) ? value : fallback;
  return Math.max(lower, Math.min(upper, numeric));
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function dedupe(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
