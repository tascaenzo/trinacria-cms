import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../../../theme.css", import.meta.url), "utf8");

function declarationsFor(theme: "light" | "dark", accent: string) {
  const tokens = new Map<string, string>();
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;

  for (const match of css.matchAll(blockPattern)) {
    const selector = match[1] ?? "";
    const body = match[2] ?? "";
    const isRoot = selector.includes(":root");
    const isDark = selector.includes('[data-theme="dark"]');
    const accentMatch = selector.match(/\[data-accent="([^"]+)"\]/);
    const blockAccent = accentMatch?.[1];
    const applies =
      isRoot ||
      (isDark === (theme === "dark") &&
        (blockAccent ? blockAccent === accent : selector.includes("data-trinacria-admin-theme")));

    if (!applies) continue;
    for (const declaration of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
      tokens.set(declaration[1] ?? "", declaration[2] ?? "");
    }
  }

  return tokens;
}

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
}

function contrast(foreground: string, background: string) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

test("theme and accent matrices preserve text and non-text contrast", () => {
  const combinations = [
    ["light", "default"],
    ["light", "ocean"],
    ["light", "forest"],
    ["light", "trinacria"],
    ["dark", "default"],
    ["dark", "ocean"],
    ["dark", "forest"],
    ["dark", "trinacria"]
  ] as const;

  for (const [theme, accent] of combinations) {
    const tokens = declarationsFor(theme, accent);
    const read = (token: string) => {
      const value = tokens.get(token);
      assert.ok(value, `${theme}/${accent}: token ${token} missing`);
      return value;
    };
    const textPairs = [
      ["--color-ink-subtle", "--color-surface"],
      ["--color-ink-muted", "--color-surface"],
      ["--color-action-primary-ink", "--color-action-primary-bg"],
      ["--color-action-primary-ink", "--color-action-primary-hover"],
      ["--color-interactive-selected-ink", "--color-interactive-selected"],
      ["--color-accent-ink", "--color-accent-soft"],
      ["--color-neutral-ink", "--color-notification-neutral-bg"],
      ["--color-info-ink", "--color-notification-info-bg"],
      ["--color-success-ink", "--color-notification-success-bg"],
      ["--color-warning-ink", "--color-notification-warning-bg"],
      ["--color-danger-ink", "--color-notification-danger-bg"]
    ] as const;
    const nonTextPairs = [
      ["--color-focus", "--color-surface"],
      ["--color-border-strong", "--color-surface"]
    ] as const;

    for (const [foreground, background] of textPairs) {
      assert.ok(
        contrast(read(foreground), read(background)) >= 4.5,
        `${theme}/${accent}: ${foreground} on ${background} is below 4.5:1`
      );
    }
    for (const [foreground, background] of nonTextPairs) {
      assert.ok(
        contrast(read(foreground), read(background)) >= 3,
        `${theme}/${accent}: ${foreground} on ${background} is below 3:1`
      );
    }
  }
});
