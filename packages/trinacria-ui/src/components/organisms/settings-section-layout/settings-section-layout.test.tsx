import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsSectionLayout } from "./settings-section-layout.js";

test("SettingsSectionLayout renders shared header canvas and actions", () => {
  const markup = renderToStaticMarkup(
    <SettingsSectionLayout
      title="Generale"
      description="Configura il sito."
      feedback={<p>Errore</p>}
      actions={<button type="button">Salva</button>}
    >
      <div>Campi</div>
    </SettingsSectionLayout>
  );

  assert.match(markup, /<h2[^>]*>Generale<\/h2>/);
  assert.match(markup, /color-surface/);
  assert.doesNotMatch(markup, /color-panel-soft/);
  assert.match(markup, /max-w-4xl/);
  assert.match(markup, /<footer/);
  assert.match(markup, />Salva<\/button>/);
});

test("SettingsSectionLayout supports wide specialist content", () => {
  const markup = renderToStaticMarkup(
    <SettingsSectionLayout title="Plugin" width="wide">
      Tabella
    </SettingsSectionLayout>
  );

  assert.match(markup, /max-w-6xl/);
  assert.doesNotMatch(markup, /<footer/);
});
