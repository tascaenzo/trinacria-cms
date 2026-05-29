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
