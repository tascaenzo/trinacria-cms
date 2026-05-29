import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatCard } from "./stat-card.js";

test("StatCard renders metric content and tone", () => {
  const markup = renderToStaticMarkup(
    <StatCard
      label="Users"
      value="42"
      tone="success"
      icon="users"
      meta="+2"
      description="Active users"
    />
  );

  assert.match(markup, /Users/);
  assert.match(markup, /42/);
  assert.match(markup, /Active users/);
  assert.match(markup, /lucide-users/);
});
