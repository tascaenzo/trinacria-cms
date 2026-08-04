import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const roots = [
  "packages/admin-kernel/src",
  "packages/editorial-pack/src/admin",
  "packages/email-pack/src/admin",
  "packages/media-pack/src/admin"
];

const approvedSpecialists = new Set([
  "packages/editorial-pack/src/admin/editorial-block-editor.tsx",
  "packages/editorial-pack/src/admin/editorial-document-preview.tsx",
  "packages/editorial-pack/src/admin/editorial-entry-detail-page.tsx",
  "packages/editorial-pack/src/admin/editorial-rich-text.tsx",
  "packages/editorial-pack/src/admin/content-type-detail/content-type-workflow-builder.tsx",
  "packages/media-pack/src/admin/file-manager/code-editor.tsx",
  "packages/media-pack/src/admin/file-manager/csv-editor.tsx",
  "packages/media-pack/src/admin/file-manager/file-manager-frame.tsx"
]);

const violations = [];

for (const root of roots) {
  for (const file of walk(root)) {
    if (!file.endsWith(".tsx") || approvedSpecialists.has(file)) continue;
    const contents = readFileSync(file, "utf8");
    const nativeElements = [...contents.matchAll(/<(button|details|input|select|textarea|table)\b/g)].map(
      ([, element]) => element
    );
    if (nativeElements.length > 0) {
      violations.push(`${file}: native ${[...new Set(nativeElements)].join(", ")}`);
    }

    if (/\brole=["'](?:alert|status)["']/.test(contents)) {
      violations.push(`${file}: custom feedback role (use FeedbackBanner or ErrorBanner)`);
    }

    const customSurface = [...contents.matchAll(/<(div|section|article|aside)\b[^>]*className="([^"]*)"/g)]
      .map(([, element, className]) => ({ element, className }))
      .find(
        ({ className }) =>
          className.includes("rounded") &&
          !className.includes("rounded-full") &&
          className.includes("border") &&
          (className.includes("bg-[color:var(--color-surface)") ||
            className.includes("bg-[color:var(--color-panel)"))
      );
    if (customSurface) {
      violations.push(`${file}: custom ${customSurface.element} surface (use Panel or Card)`);
    }
  }
}

if (violations.length > 0) {
  console.error(
    "Use @trinacria-cms/trinacria-ui controls and surfaces unless an editor-specific exception is approved:"
  );
  console.error(violations.join("\n"));
  process.exitCode = 1;
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return [relative(".", path)];
  });
}
