import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Notification, NotificationStack } from "./notification.js";

test("Notification maps warning tone to alert semantics", () => {
  const markup = renderToStaticMarkup(
    <NotificationStack>
      <Notification
        tone="warning"
        title="Careful"
        description="Check this"
        meta="now"
        onDismiss={() => undefined}
      />
    </NotificationStack>
  );

  assert.match(markup, /role="alert"/);
  assert.match(markup, /aria-live="assertive"/);
  assert.match(markup, /Careful/);
  assert.match(markup, /Dismiss notification/);
});
