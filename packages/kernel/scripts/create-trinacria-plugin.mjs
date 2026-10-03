#!/usr/bin/env node
import { lstat, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { isValidPluginId } from "../dist/runtime/index.js";

/** Copies only this package's versioned, reviewed template; never installs or executes dependencies. */
export async function createPlugin(directory, pluginId) {
  if (!isValidPluginId(pluginId) || !/^[a-z][a-z0-9-]{2,79}$/.test(pluginId))
    throw new Error("Canonical, non-reserved plugin ID required (3–80 characters)");
  const target = resolve(directory),
    parent = await realpath(dirname(target));
  if (
    target === process.cwd() ||
    target === parent ||
    ["node_modules", ".git", ".codex", ".agents"].includes(basename(target))
  )
    throw new Error("A new dedicated directory is required");
  const destination = join(parent, basename(target));
  try {
    await lstat(destination);
    throw new Error("Destination already exists; no files overwritten");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const template = JSON.parse(
    await readFile(new URL("../templates/catalog-v1.json", import.meta.url), "utf8")
  );
  if (template.version !== 1) throw new Error("Unsupported starter template version");
  for (const [file, value] of Object.entries(template.files)) {
    const path = resolve(destination, file);
    if (
      !file ||
      relative(destination, path).startsWith("..") ||
      file.split(/[\\/]/).includes("node_modules") ||
      typeof value !== "string"
    )
      throw new Error("Invalid packaged template path");
  }
  await mkdir(destination); // Exclusive creation prevents concurrent overwrites.
  try {
    for (const [file, value] of Object.entries(template.files)) {
      const path = join(destination, file);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, value.replaceAll("catalog-plugin", pluginId), { flag: "wx" });
    }
    const packagePath = join(destination, "package.json"),
      manifest = JSON.parse(await readFile(packagePath, "utf8"));
    manifest.name = pluginId;
    delete manifest.private;
    manifest.devDependencies = {
      ...manifest.devDependencies,
      typescript: "^6.0.3",
      tsx: "^4.23.15",
      "@types/node": "^24.19.0",
      "@biomejs/biome": "^2.5.5"
    };
    await writeFile(packagePath, JSON.stringify(manifest, null, 2) + "\n");
    const configPath = join(destination, "tsconfig.json"),
      config = JSON.parse(await readFile(configPath, "utf8"));
    delete config.extends;
    config.compilerOptions = {
      target: "ES2022",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      ...config.compilerOptions
    };
    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
    return { directory: destination, pluginId, templateVersion: template.version };
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
}
if (process.argv[1] && (await realpath(process.argv[1]).catch(() => "")) === import.meta.filename) {
  const [, , directory, pluginId, ...extra] = process.argv;
  try {
    if (!directory || !pluginId || extra.length)
      throw new Error("Usage: create-trinacria-plugin <new-directory> <plugin-id>");
    console.log(JSON.stringify(await createPlugin(directory, pluginId)));
    console.log(
      "Next: review README.md, npm install, npm run build, npm test. Register the backend explicitly; import /admin and rebuild your admin host."
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
