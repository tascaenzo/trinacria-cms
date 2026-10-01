import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { installDom, renderClient } from "../../../test-utils/client-render.js";
import { ContextMenu, ContextMenuItem } from "./context-menu.js";

test("ContextMenu keeps scoped theme, clamps position, navigates enabled actions and restores focus", async () => {
  const restore = installDom();
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  let closed = 0;
  try {
    const view = await renderClient(
      <div data-trinacria-admin-theme data-theme="dark">
        <ContextMenu label="Azioni file" x={window.innerWidth + 100} y={-20} onClose={() => { closed += 1; }}>
          <ContextMenuItem>Apri</ContextMenuItem>
          <ContextMenuItem disabled>Rinomina</ContextMenuItem>
          <ContextMenuItem>Elimina</ContextMenuItem>
        </ContextMenu>
      </div>
    );
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    assert.equal(menu.closest('[data-theme="dark"]')?.getAttribute("data-theme"), "dark");
    assert.ok(Number.parseFloat(menu.style.left) < window.innerWidth);
    assert.equal(menu.style.top, "8px");
    const items = menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    assert.equal(document.activeElement, items[0]);
    await React.act(async () => { items[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })); });
    assert.equal(document.activeElement, items[2]);
    await React.act(async () => { items[2].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    assert.equal(closed, 1);
    await view.unmount();
    assert.equal(document.activeElement, trigger);
  } finally { trigger.remove(); restore(); }
});

test("ContextMenu dismisses outside clicks and closes after an enabled action", async () => {
  const restore = installDom();
  let closes = 0;
  let actions = 0;
  try {
    const view = await renderClient(<ContextMenu label="Azioni" x={10} y={10} onClose={() => { closes += 1; }}><ContextMenuItem onClick={() => { actions += 1; }}>Apri</ContextMenuItem></ContextMenu>);
    await React.act(async () => { document.querySelector<HTMLButtonElement>('[role="menuitem"]')?.click(); });
    assert.equal(actions, 1);
    assert.equal(closes, 1);
    await React.act(async () => { document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
    assert.equal(closes, 2);
    await view.unmount();
  } finally { restore(); }
});
