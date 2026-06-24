import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(currentDir, "..");
const repoRoot = resolve(packageDir, "..", "..");
const currentGeneratedDir = resolve(packageDir, "src", "generated");
const tempRoot = await mkdtemp(join(tmpdir(), "trinacria-sdk-check-"));
const tempGeneratedDir = join(tempRoot, "generated");

try {
  execFileSync(
    process.execPath,
    [
      resolve(packageDir, "scripts", "generate-sdk.mjs"),
      resolve(packageDir, "openapi", "trinacria-cms.openapi.json"),
      tempGeneratedDir
    ],
    {
      cwd: repoRoot,
      stdio: "inherit"
    }
  );

  const diff = await compareDirectories(currentGeneratedDir, tempGeneratedDir);
  if (diff.length > 0) {
    process.exitCode = 1;
    console.error("[sdk:check] Generated SDK is out of date. Run `npm run sdk:generate`.");
    for (const item of diff.slice(0, 50)) {
      console.error(` - ${item}`);
    }
    if (diff.length > 50) {
      console.error(` - ...and ${diff.length - 50} more differences`);
    }
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

async function compareDirectories(leftDir, rightDir) {
  const [leftFiles, rightFiles] = await Promise.all([listFiles(leftDir), listFiles(rightDir)]);
  const allFiles = [...new Set([...leftFiles, ...rightFiles])].sort();
  const diff = [];

  for (const file of allFiles) {
    const leftHasFile = leftFiles.includes(file);
    const rightHasFile = rightFiles.includes(file);
    if (!leftHasFile || !rightHasFile) {
      diff.push(`${file} ${leftHasFile ? "missing from expected output" : "is not generated"}`);
      continue;
    }

    const [leftContent, rightContent] = await Promise.all([
      readFile(join(leftDir, file), "utf8"),
      readFile(join(rightDir, file), "utf8")
    ]);
    if (leftContent !== rightContent) {
      diff.push(`${file} differs from generated output`);
    }
  }

  return diff;
}

async function listFiles(rootDir) {
  const files = [];
  await visit(rootDir);
  return files.sort();

  async function visit(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      files.push(relative(rootDir, path));
    }
  }
}
