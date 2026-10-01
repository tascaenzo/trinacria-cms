import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { installDom, renderClient } from "../../../test-utils/client-render.js";
import { Toolbar, ToolbarButton, ToolbarSelect } from "./toolbar.js";

test("Toolbar actions preserve editor selection and expose toggle and disabled states", async () => {
  const restore = installDom();
  let actions = 0;
  try {
    const view = await renderClient(<Toolbar label="Formattazione"><ToolbarButton label="Grassetto" aria-pressed disabled={false} onMouseDown={(event) => event.preventDefault()} onClick={() => { actions += 1; }}>B</ToolbarButton><ToolbarButton label="Elimina" icon="trash-2" disabled /><ToolbarSelect label="Livello titolo"><option>H2</option></ToolbarSelect></Toolbar>);
    const button = view.container.querySelector<HTMLButtonElement>('button[aria-label="Grassetto"]')!;
    assert.equal(button.getAttribute("aria-pressed"), "true");
    const mouse = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    await React.act(async () => { button.dispatchEvent(mouse); button.click(); });
    assert.equal(mouse.defaultPrevented, true);
    assert.equal(actions, 1);
    assert.equal(view.container.querySelector<HTMLButtonElement>('button[aria-label="Elimina"]')?.disabled, true);
    assert.equal(view.container.querySelector("select")?.getAttribute("aria-label"), "Livello titolo");
    await view.unmount();
  } finally { restore(); }
});
