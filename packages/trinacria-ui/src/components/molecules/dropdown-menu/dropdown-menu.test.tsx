import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { installDom, renderClient } from "../../../test-utils/client-render.js";
import { DropdownMenu, DropdownMenuItem } from "./dropdown-menu.js";

test("DropdownMenu composes a custom trigger ref instead of replacing it", async () => {
  const restoreDom = installDom();
  const triggerRef = React.createRef<HTMLButtonElement>();

  try {
    const view = await renderClient(
      <DropdownMenu trigger={<button ref={triggerRef}>Open</button>}>
        <DropdownMenuItem>Settings</DropdownMenuItem>
      </DropdownMenu>
    );

    assert.ok(triggerRef.current instanceof HTMLElement);
    assert.equal(triggerRef.current?.textContent, "Open");

    await view.unmount();
  } finally {
    restoreDom();
  }
});

test("DropdownMenu does not preselect the first item when opened by pointer", async () => {
  const restoreDom = installDom();
  const triggerRef = React.createRef<HTMLButtonElement>();

  try {
    const view = await renderClient(
      <DropdownMenu trigger={<button ref={triggerRef}>Open</button>}>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
      </DropdownMenu>
    );

    await React.act(async () => {
      triggerRef.current?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    const profileItem = view.container.querySelector<HTMLButtonElement>('[role="menuitem"]');
    assert.ok(profileItem);
    assert.notEqual(document.activeElement, profileItem);

    await view.unmount();
  } finally {
    restoreDom();
  }
});
