import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
// @ts-expect-error Distributed JavaScript CLI is deliberately independent of source build declarations.
import { REQUIRED_SCENARIOS, runPluginScenarios } from "../scripts/plugin-conformance.mjs";

test("conformance preflights all nine functions before executing any test and always tears down", async () => {
  let executions = 0, cleanups = 0;
  const tests = Object.fromEntries(REQUIRED_SCENARIOS.slice(0, -1).map((name: string) => [name, () => { executions++; }]));
  const result = await runPluginScenarios({ tests, teardown() { cleanups++; } });
  assert.equal(result.complete, false); assert.equal(result.status, "failed");
  assert.equal(result.failedScenario, "sdk-overlay"); assert.equal(executions, 0); assert.equal(cleanups, 1);
});
test("conformance reports the actual failed scenario, stops work and rejects explicit false", async () => {
  for (const mode of ["throw", "false"]) {
    const calls: string[] = [];
    const tests = Object.fromEntries(REQUIRED_SCENARIOS.map((name: string) => [name, () => {
      calls.push(name);
      if (name === "reload-cleanup") { if (mode === "throw") throw new Error("Real assertion failed"); return false; }
    }]));
    const result = await runPluginScenarios({ tests });
    assert.equal(result.status, "failed"); assert.equal(result.complete, false);
    assert.equal(result.failedScenario, "reload-cleanup"); assert.equal(calls.length, 3);
    assert.deepEqual(result.scenarios.map((scenario: { status: string }) => scenario.status), ["passed", "passed", "failed"]);
  }
});
test("conformance only completes after all nine assertions and successful cleanup", async () => {
  const tests = Object.fromEntries(REQUIRED_SCENARIOS.map((name: string) => [name, async () => { assert.ok(name); }]));
  const result = await runPluginScenarios({ tests });
  assert.equal(result.complete, true); assert.equal(result.status, "passed"); assert.equal(result.scenarios.length, 9);
  const failed = await runPluginScenarios({ tests, teardown() { throw new Error("Cleanup failed"); } });
  assert.equal(failed.complete, false); assert.equal(failed.status, "failed"); assert.equal(failed.failedScenario, "teardown");
});
test("CLI emits distinct incomplete, passed and failed machine-readable reports with exit status", async () => {
  const directory = await mkdtemp(join(tmpdir(), "trinacria-conformance-cli-"));
  const run = promisify(execFile);
  const cli = new URL("../scripts/plugin-conformance.mjs", import.meta.url).pathname;
  try {
    await writeFile(join(directory, "manifest.json"), JSON.stringify({ id: "conformance-example", version: "0.1.0", requiresCore: "^0.1.0" }));
    const args = [cli, "--manifest", "manifest.json", "--core-version", "0.1.0"];
    assert.equal(JSON.parse((await run(process.execPath, args, { cwd: directory })).stdout).status, "incomplete");
    await writeFile(join(directory, "scenario.mjs"), `export const tests = Object.fromEntries(${JSON.stringify(REQUIRED_SCENARIOS)}.map(name => [name, () => { console.log('scenario log', name); if (!name) throw new Error('Assertion'); }]));`);
    const passed = JSON.parse((await run(process.execPath, [...args, "--scenario", "scenario.mjs"], { cwd: directory })).stdout);
    assert.equal(passed.status, "passed"); assert.equal(passed.complete, true);
    await writeFile(join(directory, "scenario.mjs"), "export const tests = {};");
    await assert.rejects(run(process.execPath, [...args, "--scenario", "scenario.mjs"], { cwd: directory }), (error: any) => {
      assert.equal(error.code, 1); assert.equal(JSON.parse(error.stdout).status, "failed"); return true;
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
