import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileRecordCard, MobileRecordField, MobileRecordList } from "./mobile-record.js";

test("MobileRecord components render compact resource records", () => {
  const markup = renderToStaticMarkup(
    <MobileRecordList>
      <MobileRecordCard
        title="Plugin"
        subtitle="core"
        badges={<span>ok</span>}
        actions={<button>Edit</button>}
      >
        <MobileRecordField label="Owner" value="kernel" />
      </MobileRecordCard>
    </MobileRecordList>
  );

  assert.match(markup, /Plugin/);
  assert.match(markup, /Owner/);
  assert.match(markup, /kernel/);
  assert.match(markup, /Edit/);
});
