import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Stepper } from "./stepper.js";

const steps = [
  { id: "setup", label: "Impostazione", description: "Nome del workflow" },
  { id: "build", label: "Componi", description: "Fasi e ordine" },
  { id: "review", label: "Conferma", description: "Riepilogo" }
] as const;

test("Stepper exposes the current step and completed progress", () => {
  const markup = renderToStaticMarkup(<Stepper items={steps} currentStep="build" />);

  assert.match(markup, /aria-label="Avanzamento"/);
  assert.match(markup, /aria-current="step"[^>]*>2/);
  assert.match(markup, />✓</);
  assert.match(markup, />Impostazione</);
  assert.match(markup, />Conferma</);
});

test("Stepper falls back to the first step when the current id is unknown", () => {
  const markup = renderToStaticMarkup(<Stepper items={steps} currentStep="missing" ariaLabel="Creazione" />);

  assert.match(markup, /aria-label="Creazione"/);
  assert.match(markup, /aria-current="step"[^>]*>1/);
});
