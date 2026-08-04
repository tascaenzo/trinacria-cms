import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { installDom, renderClient } from "../../../test-utils/client-render.js";
import { Combobox } from "./combobox.js";

test("Combobox disables its hidden submitted value when disabled", () => {
  const markup = renderToStaticMarkup(
    <Combobox
      name="plugin"
      value="core pack"
      disabled
      options={[{ label: "Core Pack", value: "core pack" }]}
    />
  );

  assert.match(markup, /type="hidden"/);
  assert.match(markup, /name="plugin"/);
  assert.match(markup, /value="core pack"/);
  assert.match(markup, /disabled=""/);
});

test("Combobox keeps focus on the input and exposes every option when opened", async () => {
  const restoreDom = installDom();

  try {
    const view = await renderClient(
      <Combobox
        id="plugin"
        label="Plugin"
        hint="Scegli un plugin"
        aria-describedby="external-help"
        value="media"
        allowClear
        options={[
          { label: "Core", value: "core" },
          { label: "Media", value: "media" },
          { label: "Editoriale", value: "editorial" }
        ]}
      />
    );

    const input = view.container.querySelector<HTMLInputElement>('[role="combobox"]');
    assert.ok(input);
    Object.assign(input, { attachEvent: () => undefined, detachEvent: () => undefined });
    await React.act(async () => input.focus());

    assert.equal(input.getAttribute("aria-describedby"), "external-help plugin-hint");
    assert.equal(view.container.querySelectorAll('[role="option"]').length, 3);
    assert.equal(view.container.querySelectorAll('[role="option"][tabindex="-1"]').length, 3);
    assert.equal(document.activeElement, input);

    await view.unmount();
  } finally {
    restoreDom();
  }
});
