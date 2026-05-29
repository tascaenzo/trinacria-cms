import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { installDom, renderClient } from "../../test-utils/client-render.js";
import { AdminShell } from "./admin-shell.js";

const navigation = [
  { id: "dashboard", routeId: "dashboard", title: "Dashboard", order: 2 },
  { id: "settings", routeId: "settings", title: "Settings", group: "System", order: 1 }
];

test("AdminShell renders navigation and calls onNavigate", async () => {
  const restoreDom = installDom();
  const calls: string[] = [];

  try {
    const view = await renderClient(
      <AdminShell
        title="Settings"
        subtitle="Manage runtime"
        activeRouteId="settings"
        navigation={navigation}
        onNavigate={(routeId) => calls.push(routeId)}
        statusBadges={[{ label: "Runtime", value: "Healthy", tone: "success" }]}
        headerActions={<button>Action</button>}
        sidebarFooter="Footer"
      >
        Content
      </AdminShell>
    );

    assert.equal(document.body.textContent?.includes("Settings"), true);
    assert.equal(document.body.textContent?.includes("Runtime"), true);
    const dashboardButton = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Dashboard")
    );
    dashboardButton?.click();
    assert.deepEqual(calls, ["dashboard"]);

    await view.unmount();
  } finally {
    restoreDom();
  }
});
