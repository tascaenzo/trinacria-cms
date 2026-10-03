import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { assertPluginCompatibility, satisfiesVersion } from "@trinacria-cms/kernel/runtime";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const baselineDir = join(root, "docs/cms/specs/core-platform/public-api");
const update = process.argv.includes("--update");
const packages = [
  "kernel",
  "core-pack",
  "editorial-pack",
  "media-pack",
  "email-pack",
  "sdk",
  "admin-kernel",
  "trinacria-ui"
];
const inventory = { formatVersion: 1, packages: {} };
const mismatches = [];
mkdirSync(baselineDir, { recursive: true });
const manifests = new Map(
  packages.map((name) => {
    const pkg = JSON.parse(readFileSync(join(root, "packages", name, "package.json"), "utf8"));
    return [pkg.name, pkg];
  })
);
for (const pkg of manifests.values()) {
  for (const kind of ["dependencies", "peerDependencies", "devDependencies"]) {
    for (const [name, range] of Object.entries(pkg[kind] ?? {})) {
      const target = manifests.get(name);
      if (target && !satisfiesVersion(target.version, range)) {
        throw new Error(`${pkg.name} ${kind}: ${name}@${target.version} is outside ${range}`);
      }
    }
  }
}
for (const [name, factory] of [
  ["core-pack", "createCorePackPlugin"],
  ["editorial-pack", "createEditorialPackPlugin"],
  ["media-pack", "createMediaPackPlugin"],
  ["email-pack", "createEmailPackPlugin"]
]) {
  const module = await import(`@trinacria-cms/${name}`);
  const { manifest } = module[factory]();
  const pkg = manifests.get(`@trinacria-cms/${name}`);
  if (manifest.version !== pkg.version)
    throw new Error(`${name}: package and plugin versions differ`);
  assertPluginCompatibility(manifest, manifests.get("@trinacria-cms/kernel").version);
}

function verify(name, content) {
  const target = join(baselineDir, name);
  if (update) writeFileSync(target, content);
  else if (!existsSync(target) || readFileSync(target, "utf8") !== content) mismatches.push(name);
}

for (const name of packages) {
  const dir = join(root, "packages", name);
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const entries = Object.entries(pkg.exports).filter(([, value]) => value.types);
  const roots = entries.map(([, value]) => join(dir, value.types));
  for (const file of roots)
    if (!existsSync(file)) throw new Error(`Build before checking public API: ${file}`);
  const program = ts.createProgram(roots, {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true
  });
  const checker = program.getTypeChecker();
  const exportedOrigins = new Set();
  const surfaces = {};
  for (const [subpath, config] of entries) {
    const source = program.getSourceFile(join(dir, config.types));
    const status = subpath === "./runtime" ? "experimental" : "public";
    const symbols = checker
      .getExportsOfModule(checker.getSymbolAtLocation(source))
      .map((symbol) => {
        const target =
          symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
        const origins = [
          ...new Set(
            (target.declarations ?? []).map((declaration) =>
              relative(root, declaration.getSourceFile().fileName).replaceAll("\\", "/")
            )
          )
        ].sort();
        for (const origin of origins) exportedOrigins.add(`${symbol.name}:${origin}`);
        return {
          symbol: symbol.name,
          status: /(?:Migration|MigrationContext|MigrationBatch)/.test(symbol.name)
            ? "experimental"
            : status,
          origins
        };
      })
      .sort((a, b) => a.symbol.localeCompare(b.symbol, "en"));
    surfaces[subpath] = symbols;
  }
  const declarations = new Map();
  function visit(file) {
    file = resolve(file);
    if (declarations.has(file) || !file.startsWith(join(dir, "dist") + "/")) return;
    const raw = readFileSync(file, "utf8").replace(/^\/\/# sourceMappingURL=.*\n?/gm, "");
    declarations.set(file, raw);
    const source = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true);
    function walk(node) {
      if (ts.isStringLiteral(node) && node.text.startsWith(".")) {
        const candidate = resolve(dirname(file), node.text.replace(/\.js$/, ".d.ts"));
        if (existsSync(candidate)) visit(candidate);
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  for (const file of roots) visit(file);
  const internal = [];
  for (const file of declarations.keys()) {
    const source = program.getSourceFile(file);
    if (!source) continue;
    const module = checker.getSymbolAtLocation(source);
    if (!module) continue;
    for (const symbol of checker.getExportsOfModule(module)) {
      const origin = relative(root, file).replaceAll("\\", "/");
      if (!exportedOrigins.has(`${symbol.name}:${origin}`))
        internal.push({ symbol: symbol.name, status: "internal", origin });
    }
  }
  inventory.packages[pkg.name] = {
    surfaces,
    internal: internal.sort((a, b) =>
      `${a.origin}:${a.symbol}`.localeCompare(`${b.origin}:${b.symbol}`, "en")
    ),
    assets: Object.entries(pkg.exports)
      .filter(([, v]) => typeof v === "string")
      .map(([path]) => path)
  };
  const snapshot = [...declarations]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([file, raw]) => `// ${relative(dir, file)}\n${raw}`)
    .join("\n");
  verify(`${name}.api.txt`, snapshot);
}
verify("exports.json", JSON.stringify(inventory, null, 2) + "\n");

const fixture = join(root, "scripts/fixtures/public-api.ts");
const program = ts.createProgram([fixture], {
  noEmit: true,
  strict: true,
  skipLibCheck: true,
  esModuleInterop: true,
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022
});
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => root,
      getNewLine: () => "\n"
    })
  );
  process.exitCode = 1;
}
if (mismatches.length) {
  console.error(
    `Public API changed: ${mismatches.join(", ")}. Review the change and run npm run public-api:update; commit snapshots with the changelog.`
  );
  process.exitCode = 1;
}
if (!process.exitCode)
  console.log(
    `${update ? "Updated" : "Verified"} eight package API snapshots, export inventory and TypeScript consumer fixture.`
  );
