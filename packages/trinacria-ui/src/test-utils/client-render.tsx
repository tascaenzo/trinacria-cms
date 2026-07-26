import { JSDOM } from "jsdom";
import type React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

type DomGlobals = Pick<
  typeof globalThis,
  "document" | "HTMLElement" | "KeyboardEvent" | "MouseEvent" | "Node" | "window"
>;
type TestGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

export function installDom() {
  const testGlobal = globalThis as TestGlobal;
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost"
  });
  const previousGlobals: Partial<DomGlobals> = {
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    KeyboardEvent: globalThis.KeyboardEvent,
    MouseEvent: globalThis.MouseEvent,
    Node: globalThis.Node,
    window: globalThis.window
  };
  const previousActEnvironment = testGlobal.IS_REACT_ACT_ENVIRONMENT;
  dom.window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 0);
  dom.window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);

  Object.assign(globalThis, {
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
    Node: dom.window.Node,
    window: dom.window
  });

  return () => {
    for (const [key, value] of Object.entries(previousGlobals)) {
      if (value === undefined) {
        Reflect.deleteProperty(globalThis, key);
      } else {
        Object.assign(globalThis, { [key]: value });
      }
    }

    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    } else {
      testGlobal.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }

    dom.window.close();
  };
}

export async function renderClient(ui: React.ReactNode) {
  const container = document.createElement("div");
  let root: Root | null = null;
  document.body.append(container);

  await act(async () => {
    root = createRoot(container);
    root.render(ui);
  });

  return {
    container,
    async unmount() {
      if (!root) {
        return;
      }

      await act(async () => {
        root?.unmount();
      });
      container.remove();
    }
  };
}
