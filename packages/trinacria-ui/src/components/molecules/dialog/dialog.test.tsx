import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { installDom, renderClient } from "../../../test-utils/client-render.js";
import { Dialog } from "./dialog.js";

test("Dialog renders modal semantics and invokes onClose from Escape", async () => {
  const restoreDom = installDom();
  let closeCount = 0;

  try {
    const view = await renderClient(
      <Dialog open title="Confirm" description="Confirm action" onClose={() => closeCount++}>
        Body
      </Dialog>
    );

    assert.ok(document.querySelector('[role="dialog"][aria-modal="true"]'));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    assert.equal(closeCount, 1);

    await view.unmount();
  } finally {
    restoreDom();
  }
});

test("Escape closes only the topmost dialog", async () => {
  const restoreDom = installDom();
  let parentCloseCount = 0;
  let childCloseCount = 0;

  try {
    const view = await renderClient(
      <Dialog open title="File manager" onClose={() => parentCloseCount++}>
        <Dialog open title="Edit media" onClose={() => childCloseCount++}>
          Editor
        </Dialog>
      </Dialog>
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    assert.equal(childCloseCount, 1);
    assert.equal(parentCloseCount, 0);

    await view.unmount();
  } finally {
    restoreDom();
  }
});
