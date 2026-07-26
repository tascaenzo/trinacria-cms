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

test("AdminShell collapses navigation groups", async () => {
  const restoreDom = installDom();

  try {
    const view = await renderClient(
      <AdminShell
        title="Settings"
        activeRouteId="settings"
        navigation={navigation}
        onNavigate={() => undefined}
      >
        Content
      </AdminShell>
    );

    const systemGroupButton = Array.from(
      document.querySelectorAll<HTMLButtonElement>("aside button")
    ).find((button) => button.textContent?.includes("System") && !button.getAttribute("title"));
    assert.ok(systemGroupButton);
    assert.equal(systemGroupButton.getAttribute("aria-expanded"), "true");

    await React.act(async () => {
      systemGroupButton.click();
    });

    assert.equal(systemGroupButton.getAttribute("aria-expanded"), "false");
    const controlledGroupId = systemGroupButton.getAttribute("aria-controls");
    assert.ok(controlledGroupId);
    assert.equal(document.getElementById(controlledGroupId)?.className.includes("hidden"), true);

    await view.unmount();
  } finally {
    restoreDom();
  }
});

test("AdminShell can hide navigation items from sidebar without removing active route metadata", async () => {
  const restoreDom = installDom();

  try {
    const view = await renderClient(
      <AdminShell
        title="Settings"
        activeRouteId="settings"
        navigation={navigation}
        hiddenNavigationIds={["settings"]}
        onNavigate={() => undefined}
      >
        Content
      </AdminShell>
    );

    const settingsNavButton = Array.from(
      document.querySelectorAll<HTMLButtonElement>("aside button")
    ).find((button) => button.getAttribute("title") === "Settings");
    assert.equal(settingsNavButton, undefined);
    assert.equal(document.body.textContent?.includes("System"), true);

    await view.unmount();
  } finally {
    restoreDom();
  }
});

test("AdminShell keeps a contextual navigation item active on detail routes", async () => {
  const restoreDom = installDom();
  const contextualNavigation = [
    {
      id: "article",
      routeId: "editorial-entries",
      title: "Article",
      params: { modelId: "article" }
    },
    {
      id: "page",
      routeId: "editorial-entries",
      title: "Page",
      params: { modelId: "page" }
    }
  ];

  try {
    const view = await renderClient(
      <AdminShell
        title="Content editor"
        activeRouteId="editorial-entry-detail"
        activeNavigationParams="entryId=entry-1&modelId=page"
        navigation={contextualNavigation}
        onNavigate={() => undefined}
      >
        Content
      </AdminShell>
    );

    const pageButton = document.querySelector<HTMLButtonElement>('button[title="Page"]');
    const articleButton = document.querySelector<HTMLButtonElement>('button[title="Article"]');
    assert.ok(pageButton?.className.includes("bg-(--color-interactive-selected)"));
    assert.equal(articleButton?.className.includes("bg-(--color-interactive-selected)"), false);

    await view.unmount();
  } finally {
    restoreDom();
  }
});
