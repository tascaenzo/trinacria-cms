import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const errors = [];
const packs = ["core-pack", "editorial-pack", "media-pack", "email-pack"];

function runtimeImports(path) {
  const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const imports = [];
  for (const node of file.statements) {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      if (
        clause?.isTypeOnly ||
        (!clause?.name &&
          bindings &&
          ts.isNamedImports(bindings) &&
          bindings.elements.every((item) => item.isTypeOnly))
      )
        continue;
      imports.push(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && !node.isTypeOnly) {
      if (
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.every((item) => item.isTypeOnly)
      )
        continue;
      imports.push(node.moduleSpecifier.text);
    }
  }
  return imports;
}

function visitBackend(path, seen = new Set()) {
  if (seen.has(path)) return;
  seen.add(path);
  for (const specifier of runtimeImports(path)) {
    if (
      /^(react(?:-dom)?(?:\/|$)|@trinacria-cms\/(?:sdk|trinacria-ui|admin-kernel)(?:\/|$))/.test(
        specifier
      ) ||
      /\/admin(?:\/|$)/.test(specifier)
    ) {
      errors.push(`${relative(root, path)}: backend imports frontend runtime ${specifier}`);
    }
    if (specifier.startsWith(".")) {
      const target = resolve(dirname(path), specifier);
      const source = [target.replace(/\.js$/, ".ts"), target.replace(/\.js$/, ".tsx")].find(
        existsSync
      );
      if (source) visitBackend(source, seen);
    }
  }
}

function frontendFiles(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? frontendFiles(join(path, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(path, entry.name)]
        : []
  );
}

// Manifest helpers are shared with the browser. Backend composition helpers belong
// in kernel/runtime; a core CJS barrel here executes server logger initialization.
function visitSharedPluginApi(path, seen = new Set()) {
  if (seen.has(path)) return;
  seen.add(path);
  for (const specifier of runtimeImports(path)) {
    if (
      specifier === "@trinacria/core" ||
      specifier === "@trinacria-cms/kernel" ||
      specifier === "@trinacria-cms/kernel/runtime" ||
      specifier.startsWith("node:") ||
      specifier.includes("/runtime/")
    ) {
      errors.push(
        `${relative(root, path)}: shared plugin-api imports backend runtime ${specifier}`
      );
    }
    if (specifier.startsWith(".")) {
      const target = resolve(dirname(path), specifier);
      const source = [target.replace(/\.js$/, ".ts"), target.replace(/\.js$/, ".tsx")].find(
        existsSync
      );
      if (source) visitSharedPluginApi(source, seen);
    }
  }
}
visitSharedPluginApi(resolve(root, "packages/kernel/src/plugin-api/index.ts"));

for (const pack of packs) {
  visitBackend(resolve(root, "packages", pack, "src/index.ts"));
  for (const file of frontendFiles(resolve(root, "packages", pack, "src/admin"))) {
    for (const imported of runtimeImports(file)) {
      if (/\/modules\/.*(?:repositories|services|controller|\.module)/.test(imported)) {
        errors.push(`${relative(root, file)}: admin imports backend implementation ${imported}`);
      }
    }
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log("Verified backend/admin runtime boundaries for four official packs.");
