#!/usr/bin/env node
import { readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { assertPluginCompatibility, validatePluginManifest } from "../dist/runtime/index.js";

export const REQUIRED_SCENARIOS = Object.freeze([
  "negative-authz",
  "lifecycle",
  "reload-cleanup",
  "missing-provider",
  "headless",
  "browser",
  "migration",
  "disable-remove-preserve",
  "sdk-overlay"
]);

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

/** Trusted test modules run in a fixed order; missing tests never produce a partial success. */
export async function runPluginScenarios(scenario) {
  const result = { complete: false, status: "failed", checks: [], scenarios: [] };
  let current = "module";
  try {
    for (const name of REQUIRED_SCENARIOS)
      if (typeof scenario.tests?.[name] !== "function") {
        current = name;
        throw new Error(`Required conformance scenario missing: ${name}`);
      }
    for (const name of REQUIRED_SCENARIOS) {
      current = name;
      const started = performance.now();
      try {
        if ((await scenario.tests[name]()) === false)
          throw new Error(`Scenario returned false: ${name}`);
        result.scenarios.push({
          name,
          status: "passed",
          durationMs: Math.round(performance.now() - started)
        });
        result.checks.push(name);
      } catch (error) {
        result.scenarios.push({
          name,
          status: "failed",
          durationMs: Math.round(performance.now() - started)
        });
        throw error;
      }
    }
    result.status = "passed";
    result.complete = true;
  } catch (error) {
    result.failedScenario = current;
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    if (typeof scenario.teardown === "function") {
      try {
        await scenario.teardown();
      } catch (error) {
        result.complete = false;
        result.status = "failed";
        result.failedScenario ??= "teardown";
        result.error ??= error instanceof Error ? error.message : String(error);
      }
    }
  }
  return result;
}

if (process.argv[1] && (await realpath(process.argv[1]).catch(() => "")) === import.meta.filename) {
  let result;
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
    result = checkPluginContract(
      JSON.parse(await readFile(flags["--manifest"], "utf8")),
      flags["--core-version"],
      flags["--openapi"] ? JSON.parse(await readFile(flags["--openapi"], "utf8")) : undefined
    );
    // Runtime scenarios are explicit, trusted local test code; never downloaded or auto-discovered.
    if (flags["--scenario"]) {
      const path = await realpath(resolve(flags["--scenario"])),
        root = await realpath(process.cwd());
      if (!path.startsWith(root + "/"))
        throw new Error("Scenario must be a local module inside the current project");
      const originalLog = console.log;
      let scenarios;
      try {
        // Keep framework/test logs off the machine-readable stdout channel.
        console.log = (...values) => console.error(...values);
        scenarios = await runPluginScenarios(await import(pathToFileURL(path).href));
      } finally {
        console.log = originalLog;
      }
      result = { ...result, ...scenarios, checks: [...result.checks, ...scenarios.checks] };
    } else result = { ...result, complete: false, status: "incomplete", scenarios: [] };
  } catch (error) {
    result = {
      ...result,
      complete: false,
      status: "failed",
      error: error instanceof Error ? error.message : String(error)
    };
  }
  console.log(JSON.stringify(result));
  if (result.status === "failed") process.exitCode = 1;
}
