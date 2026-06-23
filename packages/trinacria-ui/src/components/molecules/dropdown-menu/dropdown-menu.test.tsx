import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { installDom, renderClient } from "../../../test-utils/client-render.js";
import { DropdownMenu, DropdownMenuItem } from "./dropdown-menu.js";

test("DropdownMenu composes a custom trigger ref instead of replacing it", async () => {
  const restoreDom = installDom();
  const triggerRef = React.createRef<HTMLButtonElement>();

  try {
    const view = await renderClient(
      <DropdownMenu trigger={<button ref={triggerRef}>Open</button>}>
        <DropdownMenuItem>Settings</DropdownMenuItem>
      </DropdownMenu>
    );

    assert.ok(triggerRef.current instanceof HTMLElement);
    assert.equal(triggerRef.current?.textContent, "Open");

    await view.unmount();
  } finally {
    restoreDom();
  }
});

test("DropdownMenu does not preselect the first item when opened by pointer", async () => {
  const restoreDom = installDom();
  const triggerRef = React.createRef<HTMLButtonElement>();

  try {
    const view = await renderClient(
      <DropdownMenu trigger={<button ref={triggerRef}>Open</button>}>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
      </DropdownMenu>
    );

    await React.act(async () => {
      triggerRef.current?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    const profileItem = document.body.querySelector<HTMLButtonElement>('[role="menuitem"]');
    assert.ok(profileItem);
    assert.equal(view.container.querySelector('[role="menuitem"]'), null);
    assert.notEqual(document.activeElement, profileItem);

    await view.unmount();
  } finally {
    restoreDom();
  }
});

test("DropdownMenu keeps full-width portal content tied to trigger width", async () => {
  const restoreDom = installDom();
  const triggerRef = React.createRef<HTMLButtonElement>();

  try {
    const view = await renderClient(
      <DropdownMenu
        contentClassName="w-full min-w-0"
        trigger={<button ref={triggerRef}>Open</button>}
      >
        <DropdownMenuItem>Profile</DropdownMenuItem>
      </DropdownMenu>
    );

    triggerRef.current!.getBoundingClientRect = () =>
      ({
        bottom: 90,
        height: 40,
        left: 24,
        right: 344,
        top: 50,
        width: 320,
        x: 24,
        y: 50,
        toJSON: () => ({})
      }) as DOMRect;

    await React.act(async () => {
      triggerRef.current?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    const menu = document.body.querySelector<HTMLElement>('[role="menu"]');
    assert.ok(menu?.parentElement);
    assert.equal(menu.parentElement.style.width, "320px");

    await view.unmount();
  } finally {
    restoreDom();
  }
});

test("DropdownMenu does not force trigger width for regular portal content", async () => {
  const restoreDom = installDom();
  const triggerRef = React.createRef<HTMLButtonElement>();

  try {
    const view = await renderClient(
      <DropdownMenu contentClassName="w-56" trigger={<button ref={triggerRef}>Open</button>}>
        <DropdownMenuItem>Profile</DropdownMenuItem>
      </DropdownMenu>
    );

    triggerRef.current!.getBoundingClientRect = () =>
      ({
        bottom: 90,
        height: 40,
        left: 24,
        right: 344,
        top: 50,
        width: 320,
        x: 24,
        y: 50,
        toJSON: () => ({})
      }) as DOMRect;

    await React.act(async () => {
      triggerRef.current?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    const menu = document.body.querySelector<HTMLElement>('[role="menu"]');
    assert.ok(menu?.parentElement);
    assert.equal(menu.parentElement.style.width, "");
    assert.equal(menu.parentElement.style.minWidth, "220px");

    await view.unmount();
  } finally {
    restoreDom();
  }
});
