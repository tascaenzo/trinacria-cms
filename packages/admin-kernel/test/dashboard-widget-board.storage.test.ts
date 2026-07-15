import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeDashboardWidgetLayout,
  reorderDashboardWidgets
} from "../src/pages/dashboard-widget-board.storage.js";

const widgets = [
  { key: "core-pack:administration", layout: { defaultColumnSpan: 1, defaultRowSpan: 1 } },
  {
    key: "email-pack:delivery",
    layout: { defaultColumnSpan: 2, defaultRowSpan: 1, minColumnSpan: 1, maxColumnSpan: 3 }
  }
] as const;

test("dashboard widget layout preserves user order and visibility while adding new plugin widgets", () => {
  const layout = normalizeDashboardWidgetLayout(
    {
      order: ["email-pack:delivery", "removed-pack:widget"],
      hidden: ["email-pack:delivery", "removed-pack:widget"],
      dimensions: {
        "email-pack:delivery": { columnSpan: 3, rowSpan: 2 }
      }
    },
    widgets
  );

  assert.deepEqual(layout.order, ["email-pack:delivery", "core-pack:administration"]);
  assert.deepEqual(layout.hidden, ["email-pack:delivery"]);
  assert.deepEqual(layout.dimensions["email-pack:delivery"], { columnSpan: 3, rowSpan: 2 });
  assert.deepEqual(layout.dimensions["core-pack:administration"], { columnSpan: 1, rowSpan: 1 });
});

test("dashboard widget layout respects plugin resizing boundaries", () => {
  const layout = normalizeDashboardWidgetLayout(
    {
      dimensions: {
        "email-pack:delivery": { columnSpan: 4, rowSpan: 99 }
      }
    },
    widgets
  );

  assert.deepEqual(layout.dimensions["email-pack:delivery"], { columnSpan: 3, rowSpan: 3 });
});

test("dashboard widget drag reorder only moves visible widgets", () => {
  const current = normalizeDashboardWidgetLayout(
    {
      order: ["core-pack:administration", "email-pack:delivery"],
      hidden: ["email-pack:delivery"]
    },
    widgets
  );

  assert.deepEqual(
    reorderDashboardWidgets(current, "core-pack:administration", "email-pack:delivery"),
    current
  );
});
