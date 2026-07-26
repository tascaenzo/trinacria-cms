import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const rootPackage = readPackage(join(repositoryRoot, "package.json"));
const workspaceDirectories = expandWorkspaces(rootPackage.workspaces);
const workspaces = new Map(
  workspaceDirectories.map((directory) => {
    const manifest = readPackage(join(repositoryRoot, directory, "package.json"));
    return [manifest.name, { directory, manifest }];
  })
);
const sourceExtensions = new Set([".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".jsx", ".tsx"]);
const ignoredDirectories = new Set([
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "src/generated",
  "test",
  "tests"
]);
const dependencyErrors = [];

for (const [workspaceName, workspace] of workspaces) {
  const declaredDependencies = new Set(
    [
      workspace.manifest.dependencies,
      workspace.manifest.devDependencies,
      workspace.manifest.peerDependencies,
      workspace.manifest.optionalDependencies
    ].flatMap((dependencies) => Object.keys(dependencies ?? {}))
  );

  for (const sourceFile of sourceFiles(join(repositoryRoot, workspace.directory))) {
    const source = readFileSync(sourceFile, "utf8");
    for (const importedWorkspace of workspaceImports(source)) {
      if (importedWorkspace === workspaceName || !workspaces.has(importedWorkspace)) {
        continue;
      }
      if (!declaredDependencies.has(importedWorkspace)) {
        dependencyErrors.push(
          `${relative(repositoryRoot, sourceFile)} imports ${importedWorkspace}, ` +
            `but ${workspace.directory}/package.json does not declare it.`
        );
      }
    }
  }
}

if (dependencyErrors.length) {
  console.error("Workspace dependency declarations are incomplete:\n");
  for (const error of dependencyErrors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Verified declared internal dependencies for ${workspaces.size} workspaces.`);
}

function readPackage(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function expandWorkspaces(patterns) {
  return patterns.flatMap((pattern) => {
    if (!pattern.endsWith("/*")) {
      return [pattern];
    }
    const parent = join(repositoryRoot, pattern.slice(0, -2));
    return readdirSync(parent, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && existsSync(join(parent, entry.name, "package.json"))
      )
      .map((entry) => join(pattern.slice(0, -1), entry.name));
  });
}

function sourceFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(relative(directory, path)) || ignoredDirectories.has(entry.name)
        ? []
        : sourceFiles(path);
    }
    return entry.isFile() && sourceExtensions.has(extension(entry.name)) ? [path] : [];
  });
}

function extension(fileName) {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index);
}

function workspaceImports(source) {
  return new Set(
    [...source.matchAll(/(?:from\s*|import\s*\(|require\s*\()["'](@trinacria-cms\/[^/"']+)/g)].map(
      (match) => match[1]
    )
  );
}
