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
