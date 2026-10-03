#!/usr/bin/env node
import { readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertPluginCompatibility, validatePluginManifest } from "../dist/runtime/index.js";
export function checkPluginContract(input, coreVersion, openapi) {
  const manifest = validatePluginManifest(input);
  assertPluginCompatibility(manifest, coreVersion);
  const checks = ["manifest", "semver", "namespaces", "event-delivery", "entity-versions"];
  if (openapi) {
    const operations = [],
      ids = new Set();
    for (const [path, methods] of Object.entries(openapi.paths ?? {}))
      for (const [method, operation] of Object.entries(methods)) {
        if (
          !["get", "post", "put", "patch", "delete"].includes(method) ||
          operation["x-cms-plugin-id"] !== manifest.id
        )
          continue;
        if (
          !operation.operationId ||
          ids.has(operation.operationId) ||
          !operation.responses?.[200]?.content?.["application/json"]?.schema ||
          !operation.security?.length
        )
          throw new Error(`Missing schema/security or duplicate operationId: ${method} ${path}`);
        ids.add(operation.operationId);
        operations.push(operation.operationId);
        if (method !== "get" && !operation.requestBody?.content?.["application/json"]?.schema)
          throw new Error(`Mutation body schema missing: ${operation.operationId}`);
      }
    if (!operations.length) throw new Error("No documented HTTP operations for this plugin");
    checks.push("http-owner", "http-response-schema", "http-security", "http-input-schema");
  }
  return { pluginId: manifest.id, checks };
}
if (process.argv[1] && (await realpath(process.argv[1]).catch(() => "")) === import.meta.filename) {
  try {
    const args = process.argv.slice(2),
      flags = {};
    for (let index = 0; index < args.length; index += 2) {
      if (
        !["--manifest", "--core-version", "--openapi", "--scenario"].includes(args[index]) ||
        !args[index + 1] ||
        flags[args[index]]
      )
        throw new Error(
          "Usage: cms-plugin-conformance --manifest file.json --core-version version [--openapi file.json] [--scenario local-module.mjs]"
        );
      flags[args[index]] = args[index + 1];
    }
    const result = checkPluginContract(
      JSON.parse(await readFile(flags["--manifest"], "utf8")),
      flags["--core-version"],
      flags["--openapi"] ? JSON.parse(await readFile(flags["--openapi"], "utf8")) : undefined
    );
    // Runtime scenarios are explicit, trusted local test code; never downloaded or auto-discovered.
    if (flags["--scenario"]) {
      const path = await realpath(resolve(flags["--scenario"]));
      const root = await realpath(process.cwd());
      if (!path.startsWith(root + "/"))
        throw new Error("Scenario must be a local module inside the current project");
      const scenario = await import(pathToFileURL(path).href);
      const required = [
        "negative-authz",
        "lifecycle",
        "reload-cleanup",
        "missing-provider",
        "headless",
        "browser",
        "migration",
        "disable-remove-preserve",
        "sdk-overlay"
      ];
      for (const name of required) {
        if (typeof scenario.tests?.[name] !== "function")
          throw new Error(`Required conformance scenario missing: ${name}`);
        await scenario.tests[name]();
        result.checks.push(name);
      }
      result.complete = true;
    } else result.complete = false;
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
