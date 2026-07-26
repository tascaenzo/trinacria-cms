import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Tabs } from "./tabs.js";

const items = [
  { value: "available", label: "Disponibili", count: 3 },
  { value: "deleted", label: "Eliminati", count: 1 }
] as const;

test("Tabs connects the selected tab to its panel", () => {
  const markup = renderToStaticMarkup(
    <Tabs items={items} value="deleted" onValueChange={() => undefined} ariaLabel="Modelli">
      Contenuto eliminato
    </Tabs>
  );

  assert.match(markup, /role="tablist" aria-label="Modelli"/);
  assert.match(markup, /role="tab"[^>]*aria-selected="true"[^>]*>.*Eliminati/);
  assert.match(markup, /role="tabpanel"/);
  assert.match(markup, />Contenuto eliminato</);
});

test("Tabs falls back to the first enabled item", () => {
  const markup = renderToStaticMarkup(
    <Tabs items={items} value="missing" onValueChange={() => undefined}>
      Elenco
    </Tabs>
  );

  assert.match(markup, /role="tab"[^>]*aria-selected="true"[^>]*>.*Disponibili/);
});
