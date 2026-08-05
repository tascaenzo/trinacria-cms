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
  assert.match(markup, /Chiudi notifica/);
  assert.match(markup, /color-notification-warning-bg/);
  assert.match(markup, /shadow-notification/);
});

test("Notification gives every semantic tone a dedicated tinted surface", () => {
  const markup = renderToStaticMarkup(
    <NotificationStack>
      <Notification tone="info" title="Info" />
      <Notification tone="success" title="Saved" />
      <Notification tone="danger" title="Failed" />
    </NotificationStack>
  );

  assert.match(markup, /color-notification-info-bg/);
  assert.match(markup, /color-notification-success-bg/);
  assert.match(markup, /color-notification-danger-bg/);
  assert.doesNotMatch(markup, /color-info-bg/);
  assert.doesNotMatch(markup, /color-success-bg/);
  assert.doesNotMatch(markup, /color-danger-bg/);
});
