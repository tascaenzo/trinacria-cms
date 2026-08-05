import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { installDom, renderClient } from "../../../test-utils/client-render.js";
import { ToastProvider, useToast } from "./toast.js";

test("ToastProvider clears timers for toast ids removed by maxVisible", async () => {
  const restoreDom = installDom();
  const originalClearTimeout = window.clearTimeout;
  const clearedTimeouts: number[] = [];

  window.clearTimeout = ((timeoutId: number | undefined) => {
    if (typeof timeoutId === "number") {
      clearedTimeouts.push(timeoutId);
    }

    return originalClearTimeout(timeoutId);
  }) as typeof window.clearTimeout;

  function PushTwoToasts() {
    const toast = useToast();
    const hasPushedRef = React.useRef(false);

    React.useEffect(() => {
      if (hasPushedRef.current) {
        return;
      }

      hasPushedRef.current = true;
      toast.pushToast({ id: "first", title: "First", duration: 60_000 });
      toast.pushToast({ id: "second", title: "Second", duration: 60_000 });
    }, [toast]);

    return null;
  }

  try {
    const view = await renderClient(
      <ToastProvider maxVisible={1}>
        <PushTwoToasts />
      </ToastProvider>
    );

    assert.equal(clearedTimeouts.length, 1);
    assert.equal(document.body.textContent?.includes("Second"), true);
    assert.equal(document.body.textContent?.includes("First"), false);

    await view.unmount();
  } finally {
    window.clearTimeout = originalClearTimeout;
    restoreDom();
  }
});

test("ToastProvider renders success and danger feedback with accessible urgency", async () => {
  const restoreDom = installDom();

  function PushFeedbackToasts() {
    const toast = useToast();
    const hasPushedRef = React.useRef(false);

    React.useEffect(() => {
      if (hasPushedRef.current) return;
      hasPushedRef.current = true;
      toast.pushToast({
        id: "saved",
        title: "Salvato",
        description: "Le modifiche sono state salvate.",
        tone: "success",
        duration: 60_000
      });
      toast.pushToast({
        id: "failed",
        title: "Salvataggio non riuscito",
        description: "Riprova.",
        tone: "danger",
        duration: 0
      });
    }, [toast]);

    return null;
  }

  try {
    const view = await renderClient(
      <ToastProvider>
        <PushFeedbackToasts />
      </ToastProvider>
    );

    assert.equal(document.body.textContent?.includes("Le modifiche sono state salvate."), true);
    assert.equal(document.body.querySelector('[role="status"]')?.textContent?.includes("Salvato"), true);
    assert.equal(
      document.body.querySelector('[role="alert"]')?.textContent?.includes("Salvataggio non riuscito"),
      true
    );

    await view.unmount();
  } finally {
    restoreDom();
  }
});

test("ToastProvider keeps notifications with actions persistent by default", async () => {
  const restoreDom = installDom();
  const originalSetTimeout = window.setTimeout;
  const scheduledDelays: number[] = [];
  window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    if (typeof timeout === "number") scheduledDelays.push(timeout);
    return originalSetTimeout(handler, timeout, ...args);
  }) as typeof window.setTimeout;

  function PushActionToast() {
    const toast = useToast();
    const pushed = React.useRef(false);
    React.useEffect(() => {
      if (pushed.current) return;
      pushed.current = true;
      toast.pushToast({ id: "undo", title: "Elemento eliminato", action: <button>Annulla</button> });
    }, [toast]);
    return null;
  }

  try {
    const view = await renderClient(
      <ToastProvider>
        <PushActionToast />
      </ToastProvider>
    );
    assert.equal(document.body.textContent?.includes("Annulla"), true);
    assert.equal(scheduledDelays.includes(5000), false);
    await view.unmount();
  } finally {
    window.setTimeout = originalSetTimeout;
    restoreDom();
  }
});
