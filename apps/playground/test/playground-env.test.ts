import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);

test("explicit CMS_ENV_FILE loads values without overriding the process environment", async () => {
  const directory = await mkdtemp(join(tmpdir(), "trinacria-env-test-"));
  const path = join(directory, "cms.env");
  try {
    await writeFile(
      path,
      "CMS_DEPENDENCY_TEST_NEW=loaded\nCMS_DEPENDENCY_TEST_PREEXISTING=from-file\n"
    );
    const moduleUrl = new URL("../src/playground-env.ts", import.meta.url);
    const { stdout } = await run(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "--eval",
        `import { loadPlaygroundEnv } from ${JSON.stringify(moduleUrl.href)};
        console.log(JSON.stringify({
          path: loadPlaygroundEnv(),
          configuredPath: process.env.CMS_ENV_FILE,
          loaded: process.env.CMS_DEPENDENCY_TEST_NEW,
          retained: process.env.CMS_DEPENDENCY_TEST_PREEXISTING
        }));`
      ],
      {
        env: {
          ...process.env,
          CMS_ENV_FILE: path,
          CMS_DEPENDENCY_TEST_NEW: undefined,
          CMS_DEPENDENCY_TEST_PREEXISTING: "from-process"
        }
      }
    );
    const result = JSON.parse(stdout.trim().split("\n").at(-1) ?? "{}");
    assert.deepEqual(result, {
      path,
      configuredPath: path,
      loaded: "loaded",
      retained: "from-process"
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
