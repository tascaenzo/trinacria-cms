import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { cp, lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { chromium } from "@playwright/test";
import { packRelease, repository } from "./pack.mjs";
import { prepareCatalogV2 } from "./prepare-catalog-v2.mjs";

const fixtureRoot = await mkdtemp(join(tmpdir(), "trinacria-external-host-"));
const children = new Set();
let registry, browser, catalogCleanupDirectory, backendCleanupDirectory;
const fixtureFiles = join(import.meta.dirname, "fixtures");
const installedVersion = async (name) =>
  JSON.parse(await readFile(join(repository, "node_modules", name, "package.json"), "utf8"))
    .version;
const mongoTarget = new URL(
  process.env.TRINACRIA_EXTERNAL_MONGO_URI ??
    "mongodb://trinacria:trinacria@127.0.0.1:27017/?authSource=admin"
);
mongoTarget.pathname = `/trinacria_external_host_${randomUUID().replaceAll("-", "")}_e2e`;
function command(program, args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"]
    });
    children.add(child);
    const deadline = setTimeout(() => child.kill("SIGKILL"), 300000);
    let output = "",
      errors = "";
    child.stdout.on("data", (data) => {
      output += data;
    });
    child.stderr.on("data", (data) => {
      errors += data;
    });
    child.on("error", (error) => {
      clearTimeout(deadline);
      children.delete(child);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(deadline);
      children.delete(child);
      code === 0
        ? resolve(output)
        : reject(new Error(`${program} ${args.join(" ")} exited ${code}\n${output}${errors}`));
    });
  });
}
async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function assertNoSymlinks(directory) {
  for (const name of await readdir(directory)) {
    if (name === ".bin") continue; // npm's executable shims are intentional.
    const file = join(directory, name),
      stat = await lstat(file);
    assert.ok(!stat.isSymbolicLink(), `Fixture dependency is a symlink: ${file}`);
    if (stat.isDirectory()) await assertNoSymlinks(file);
  }
}
async function waitReady(child, marker) {
  await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => reject(new Error(`Fixture readiness timeout\n${output}`)),
      30000
    );
    const onData = (data) => {
      output += data;
      if (stripVTControlCharacters(output).includes(marker)) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Fixture exited ${code}\n${output}`));
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
try {
  // A failed attempt must not leave a previous success report as current evidence.
  await rm(join(repository, ".tmp/release/external-host-result.json"), { force: true });
  await rm(join(repository, ".tmp/release/catalog-conformance-result.json"), { force: true });
  const artifactsDir = join(fixtureRoot, "artifacts");
  const inventory = await packRelease(artifactsDir);
  const artifacts = new Map(inventory.artifacts.map((artifact) => [artifact.name, artifact]));
  registry = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(
        new URL(request.url, "http://fixture.invalid").pathname
      ).slice(1);
      if (path.startsWith("tarballs/")) {
        const file = path.slice("tarballs/".length);
        const artifact = inventory.artifacts.find((item) => item.filename === file);
        if (!artifact) {
          response.writeHead(404);
          response.end();
          return;
        }
        const bytes = await readFile(join(artifactsDir, file));
        assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.sha256);
        response.writeHead(200, { "content-type": "application/octet-stream" });
        response.end(bytes);
        return;
      }
      const artifact = artifacts.get(path);
      if (!artifact) {
        response.writeHead(404);
        response.end();
        return;
      }
      const port = registry.address().port;
      const dist = {
        tarball: `http://127.0.0.1:${port}/tarballs/${artifact.filename}`,
        integrity: artifact.integrity
      };
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          name: path,
          "dist-tags": { latest: artifact.version },
          versions: { [artifact.version]: { ...artifact.manifest, dist } }
        })
      );
    } catch {
      response.writeHead(500);
      response.end("Fixture registry failure");
    }
  });
  await new Promise((resolve) => registry.listen(0, "127.0.0.1", resolve));
  const registryUrl = `http://127.0.0.1:${registry.address().port}/`;
  const backendDir = join(fixtureRoot, "backend");
  await mkdir(backendDir);
  await writeFile(
    join(backendDir, ".npmrc"),
    `@trinacria-cms:registry=${registryUrl}\nfund=false\naudit=false\n`
  );
  const backendNames = ["kernel", "core-pack", "sdk", "editorial-pack", "media-pack", "email-pack"];
  const dependencies = Object.fromEntries(
    backendNames.map((name) => [`@trinacria-cms/${name}`, inventory.version])
  );
  dependencies.mongoose = await installedVersion("mongoose");
  await writeFile(
    join(backendDir, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies,
      devDependencies: { "@playwright/test": await installedVersion("@playwright/test") }
    })
  );
  await command("npm", ["install", "--ignore-scripts"], backendDir);
  await assertNoSymlinks(join(backendDir, "node_modules/@trinacria-cms"));
  await assert.rejects(lstat(join(backendDir, "node_modules/react")), { code: "ENOENT" });
  await writeFile(
    join(backendDir, ".env"),
    "# Isolated test host; configuration is supplied via process environment.\n"
  );
  await cp(join(fixtureFiles, "backend.mjs"), join(backendDir, "backend.mjs"));
  await cp(join(fixtureFiles, "external-cleanup.mjs"), join(backendDir, "external-cleanup.mjs"));
  backendCleanupDirectory = backendDir;
  await cp(join(fixtureFiles, "consumer.ts"), join(backendDir, "consumer.ts"));
  await command(
    process.execPath,
    [
      join(repository, "node_modules/typescript/bin/tsc"),
      "--strict",
      "--noEmit",
      "--skipLibCheck",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--target",
      "ES2022",
      "consumer.ts"
    ],
    backendDir
  );
  const apiPort = await freePort();
  const backend = spawn(process.execPath, ["backend.mjs"], {
    cwd: backendDir,
    env: {
      ...process.env,
      NODE_ENV: "test",
      FIXTURE_PORT: String(apiPort),
      MONGO_URI: mongoTarget.toString()
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.add(backend);
  await waitReady(backend, "EXTERNAL_BACKEND_READY");
  for (const file of ["migration-host.mjs", "migrate.mjs"])
    await cp(join(fixtureFiles, file), join(backendDir, file));
  const migrationEnv = { MONGO_URI: mongoTarget.toString(), FIXTURE_OPERATOR_TOKEN: randomUUID() };
  const fixtureAction = async (action) =>
    command(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `const { createMigrationDeployHost } = await import("./migration-host.mjs"); const host = await createMigrationDeployHost(); try { await host.${action}(); } finally { await host.close(); }`
      ],
      backendDir,
      migrationEnv
    );
  await fixtureAction("initializeFixture");
  const cli = join(backendDir, "node_modules/.bin/cms");
  const args = [
    "migrations",
    "plan",
    "--host",
    "./migration-host.mjs",
    "--plugin",
    "catalog-migrations"
  ];
  const plan = JSON.parse(await command(cli, args, backendDir, migrationEnv));
  assert.equal(plan.pending.length, 1);
  args[1] = "apply";
  await assert.rejects(
    command(cli, args, backendDir, { ...migrationEnv, CMS_OPERATOR_TOKEN: "" }),
    /CMS_OPERATOR_TOKEN required/
  );
  const operatorEnv = { ...migrationEnv, CMS_OPERATOR_TOKEN: migrationEnv.FIXTURE_OPERATOR_TOKEN };
  await assert.rejects(
    command(cli, args, backendDir, operatorEnv),
    /requires explicit permission and verified backup/
  );
  await command(
    cli,
    [...args, "--allow-destructive", "--backup", "fixture-backup-verified"],
    backendDir,
    operatorEnv
  );
  args[1] = "status";
  const status = JSON.parse(await command(cli, args, backendDir, migrationEnv));
  assert.equal(status[0].status, "applied");
  await fixtureAction("verifyFixture");
  console.log(
    "Distributed cms migrations CLI passed: plan/apply/status, denied missing token/backup and real data upgrade"
  );
  console.log(
    "Backend cold start passed: real tarballs, real Mongo, no React or workspace symlinks"
  );
  // Generate and compile outside the monorepo, then install physical tarballs in the host.
  const catalogDir = join(fixtureRoot, "catalog-plugin");
  await command(
    join(backendDir, "node_modules/.bin/create-trinacria-plugin"),
    [catalogDir, "catalog-plugin"],
    backendDir
  );
  await cp(join(backendDir, ".npmrc"), join(catalogDir, ".npmrc"));
  await command("npm", ["install", "--ignore-scripts"], catalogDir);
  await command("npm", ["run", "build"], catalogDir);
  await command("npm", ["test"], catalogDir);
  const [catalogPack] = JSON.parse(
    await command(
      "npm",
      ["pack", "--json", "--ignore-scripts", "--pack-destination", artifactsDir],
      catalogDir
    )
  );
  const [consumerPack] = JSON.parse(
    await command(
      "npm",
      ["pack", "--json", "--ignore-scripts", "--pack-destination", artifactsDir],
      join(repository, "examples/catalog-consumer")
    )
  );
  await command(
    "npm",
    [
      "install",
      "--ignore-scripts",
      join(artifactsDir, catalogPack.filename),
      join(artifactsDir, consumerPack.filename)
    ],
    backendDir
  );
  await assertNoSymlinks(join(backendDir, "node_modules/catalog-plugin"));
  await assertNoSymlinks(join(backendDir, "node_modules/@trinacria-cms/example-catalog-consumer"));
  await assert.rejects(lstat(join(backendDir, "node_modules/react")), { code: "ENOENT" });
  await cp(join(fixtureFiles, "catalog-check.mjs"), join(backendDir, "catalog-check.mjs"));
  await cp(join(fixtureFiles, "catalog-cleanup.mjs"), join(backendDir, "catalog-cleanup.mjs"));
  catalogCleanupDirectory = backendDir;
  const catalogPort = await freePort();
  const catalogHost = spawn(process.execPath, ["catalog-check.mjs"], {
    cwd: backendDir,
    env: { ...process.env, MONGO_URI: mongoTarget.toString(), CATALOG_PORT: String(catalogPort) },
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
  children.add(catalogHost);
  let catalogOutput = "";
  catalogHost.stdout.on("data", (data) => {
    catalogOutput += data;
  });
  catalogHost.stderr.on("data", (data) => {
    catalogOutput += data;
  });
  const catalogExit = new Promise((resolve) => catalogHost.once("exit", (code) => resolve(code)));
  const catalogReady = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Catalog readiness timeout\n${catalogOutput}`)),
      // Readiness includes cold start, installation, auth and lifecycle assertions.
      120000
    );
    catalogHost.once("message", (message) => {
      clearTimeout(timer);
      message?.type === "catalog-ready"
        ? resolve(message)
        : reject(new Error("Invalid catalog fixture readiness"));
    });
    catalogHost.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Catalog exited ${code}\n${catalogOutput}`));
    });
    catalogHost.once("error", reject);
  });
  const conformance = JSON.parse(
    await command(
      join(backendDir, "node_modules/.bin/cms-plugin-conformance"),
      [
        "--manifest",
        "catalog-manifest.json",
        "--core-version",
        inventory.version,
        "--openapi",
        "catalog-openapi.json"
      ],
      backendDir
    )
  );
  assert.ok(conformance.checks.includes("http-security"));
  assert.equal(conformance.complete, false); // Static checks do not execute the nine runtime scenarios.
  assert.equal(conformance.status, "incomplete");
  await command(
    join(backendDir, "node_modules/.bin/trinacria-sdk"),
    ["catalog-openapi.json", "catalog-sdk", "--mode", "overlay", "--owner", "catalog-plugin"],
    backendDir
  );
  await cp(join(fixtureFiles, "catalog-overlay.ts"), join(backendDir, "catalog-overlay.ts"));
  await command(
    process.execPath,
    [
      join(repository, "node_modules/typescript/bin/tsc"),
      "--strict",
      "--skipLibCheck",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2022",
      "--outDir",
      "catalog-overlay-dist",
      "catalog-overlay.ts"
    ],
    backendDir
  );
  const frontendDir = join(fixtureRoot, "frontend");
  await mkdir(frontendDir);
  await cp(join(backendDir, ".npmrc"), join(frontendDir, ".npmrc"));
  const frontendDependencies = Object.fromEntries(
    inventory.artifacts.map((artifact) => [artifact.name, artifact.version])
  );
  frontendDependencies["catalog-plugin"] = join(artifactsDir, catalogPack.filename);
  for (const name of ["react", "react-dom", "vite"])
    frontendDependencies[name] = await installedVersion(name);
  await writeFile(
    join(frontendDir, "package.json"),
    JSON.stringify({ private: true, type: "module", dependencies: frontendDependencies })
  );
  await command("npm", ["install", "--ignore-scripts"], frontendDir);
  await assertNoSymlinks(join(frontendDir, "node_modules/@trinacria-cms"));
  const tree = JSON.parse(
    await command("npm", ["ls", "react", "react-dom", "--all", "--json"], frontendDir)
  );
  const versions = new Set();
  function walk(tree) {
    for (const [name, item] of Object.entries(tree.dependencies ?? {})) {
      if (name === "react") versions.add(item.version);
      walk(item);
    }
  }
  walk(tree);
  assert.equal(versions.size, 1);
  // Verify physical copies too: npm ls can report multiple copies of the same version.
  async function countReact(dir) {
    let count = 0;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const path = join(dir, entry.name);
      if (entry.name === "react" && (await lstat(join(path, "package.json")).catch(() => null)))
        count++;
      else count += await countReact(path);
    }
    return count;
  }
  assert.equal(await countReact(join(frontendDir, "node_modules")), 1);
  await cp(join(fixtureFiles, "main.ts"), join(frontendDir, "main.ts"));
  await cp(join(fixtureFiles, "catalog-main.tsx"), join(frontendDir, "catalog-main.tsx"));
  await writeFile(
    join(frontendDir, "catalog.html"),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/catalog-main.tsx"></script></body></html>'
  );
  await writeFile(
    join(frontendDir, "index.html"),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/main.ts"></script></body></html>'
  );
  await writeFile(
    join(frontendDir, "vite.config.mjs"),
    `export default {build:{rollupOptions:{input:['index.html','catalog.html']}},server:{proxy:{'/cms':{target:'http://127.0.0.1:${apiPort}',rewrite:path=>path.replace(/^\\/cms/,'')},'/catalog-cms':{target:'http://127.0.0.1:${catalogPort}',rewrite:path=>path.replace(/^\\/catalog-cms/,'')}}}};`
  );
  await command(process.execPath, ["node_modules/vite/bin/vite.js", "build"], frontendDir);
  const browserPort = await freePort();
  const frontend = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      String(browserPort),
      "--strictPort"
    ],
    { cwd: frontendDir, stdio: ["ignore", "pipe", "pipe"] }
  );
  children.add(frontend);
  await waitReady(frontend, "Local:");
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${browserPort}`);
  await page.locator('input[name="siteName"]').waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "External admin build and Chromium installation screen passed with one physical React copy"
  );
  const catalogPage = await browser.newPage();
  catalogPage.on("pageerror", (error) => errors.push(error.message));
  await catalogPage.addInitScript((token) => {
    window.fixtureCatalogToken = token;
  }, catalogReady.token);
  await catalogPage.goto(`http://127.0.0.1:${browserPort}/catalog.html`);
  await catalogPage.getByRole("button", { name: "Edit Updated item", exact: true }).waitFor();
  await catalogPage.getByLabel("Item name").fill("Browser item");
  await catalogPage.getByLabel("Price in cents").fill("4200");
  await catalogPage.getByRole("button", { name: "Create item", exact: true }).press("Enter");
  await catalogPage.getByRole("button", { name: "Edit Browser item", exact: true }).click();
  await catalogPage.getByLabel("Item name").fill("Browser changed");
  await catalogPage.getByRole("button", { name: "Save item", exact: true }).click();
  await catalogPage.getByRole("button", { name: "Delete Browser changed", exact: true }).click();
  await catalogPage.getByText("1 items on this page", { exact: true }).waitFor();
  // A stale browser revision must be rejected, then the page must recover through reload.
  await catalogPage.getByRole("button", { name: "Edit Updated item", exact: true }).click();
  const changed = await fetch(
    `http://127.0.0.1:${catalogPort}/v1/catalog/items/${catalogReady.itemId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${catalogReady.token}`
      },
      body: JSON.stringify({
        expectedVersion: 2,
        input: { name: "Concurrent update", priceCents: 1300 }
      })
    }
  );
  assert.equal(changed.status, 200);
  await catalogPage.getByRole("button", { name: "Save item", exact: true }).click();
  await catalogPage.getByRole("alert").filter({ hasText: "This item changed" }).waitFor();
  await catalogPage.getByRole("button", { name: "Reload catalog", exact: true }).click();
  await catalogPage.getByRole("button", { name: "Edit Concurrent update", exact: true }).waitFor();
  await catalogPage.route("**/catalog-cms/v1/catalog/items?*", (route) => route.abort());
  await catalogPage.getByRole("button", { name: "Reload catalog", exact: true }).click();
  await catalogPage.getByRole("alert").filter({ hasText: "Catalog unavailable" }).waitFor();
  await catalogPage.unrouteAll();
  await catalogPage.getByRole("button", { name: "Reload catalog", exact: true }).click();
  await catalogPage.getByRole("button", { name: "Edit Concurrent update", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  catalogHost.send({ type: "catalog-continue" });
  const catalogCode = await catalogExit;
  assert.equal(catalogCode, 0, catalogOutput);
  assert.match(catalogOutput, /EXTERNAL_CATALOG_PASSED/);
  children.delete(catalogHost);
  console.log(
    "External catalog passed real Mongo/authz/events/reload/uninstall, typed SDK overlay and Chromium CRUD/conflict/API-down recovery"
  );
  await prepareCatalogV2(catalogDir);
  await command("npm", ["run", "build"], catalogDir);
  const checksum = (
    await command(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'const {computeMigrationChecksum}=await import("@trinacria-cms/kernel/runtime"); console.log(await computeMigrationChecksum(process.cwd(), ["dist/migrate-v2.js"]));'
      ],
      catalogDir
    )
  ).trim();
  assert.match(checksum, /^[a-f0-9]{64}$/);
  const nextManifest = join(catalogDir, "src/manifest.ts");
  await writeFile(
    nextManifest,
    (await readFile(nextManifest, "utf8")).replace("0".repeat(64), checksum)
  );
  await command("npm", ["run", "build"], catalogDir);
  const [nextPack] = JSON.parse(
    await command(
      "npm",
      ["pack", "--json", "--ignore-scripts", "--pack-destination", artifactsDir],
      catalogDir
    )
  );
  await command(
    "npm",
    ["install", "--ignore-scripts", join(artifactsDir, nextPack.filename)],
    backendDir
  );
  await cp(
    join(fixtureFiles, "catalog-upgrade-host.mjs"),
    join(backendDir, "catalog-upgrade-host.mjs")
  );
  const upgradeEnv = {
    MONGO_URI: mongoTarget.toString(),
    CMS_OPERATOR_TOKEN: migrationEnv.FIXTURE_OPERATOR_TOKEN,
    FIXTURE_OPERATOR_TOKEN: migrationEnv.FIXTURE_OPERATOR_TOKEN,
    CATALOG_ADMIN_PASSWORD: catalogReady.password,
    CATALOG_PORT: String(await freePort())
  };
  const upgradeArgs = [
    "migrations",
    "plan",
    "--host",
    "./catalog-upgrade-host.mjs",
    "--plugin",
    "catalog-plugin"
  ];
  const upgradePlan = JSON.parse(await command(cli, upgradeArgs, backendDir, upgradeEnv));
  assert.equal(upgradePlan.pending.length, 1);
  upgradeArgs[1] = "apply";
  await command(cli, upgradeArgs, backendDir, upgradeEnv);
  upgradeArgs[1] = "status";
  assert.equal(
    JSON.parse(await command(cli, upgradeArgs, backendDir, upgradeEnv))[0].status,
    "applied"
  );
  const upgraded = await command(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      'const {createMigrationDeployHost}=await import("./catalog-upgrade-host.mjs"); const host=await createMigrationDeployHost(); try { await host.verifyUpgrade(); } finally { await host.close(); }'
    ],
    backendDir,
    upgradeEnv
  );
  assert.match(upgraded, /CATALOG_UPGRADE_PASSED/);
  console.log(
    "Generated catalog 0.1→0.2 passed distributed CLI migration and cold-start HTTP with preserved data and new currency"
  );
  // The reference module runs inside the physical external host and uses only public exports.
  for (const file of ["catalog-conformance.mjs", "catalog-recovery.mjs"])
    await cp(join(fixtureFiles, file), join(backendDir, file));
  await command(
    join(backendDir, "node_modules/.bin/trinacria-sdk"),
    ["catalog-openapi.json", "catalog-sdk", "--mode", "overlay", "--owner", "catalog-plugin"],
    backendDir
  );
  await command(
    process.execPath,
    [
      join(repository, "node_modules/typescript/bin/tsc"),
      "--strict",
      "--skipLibCheck",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2022",
      "--outDir",
      "catalog-overlay-dist",
      "catalog-overlay.ts"
    ],
    backendDir
  );
  const completeConformance = JSON.parse(
    await command(
      join(backendDir, "node_modules/.bin/cms-plugin-conformance"),
      [
        "--manifest",
        "catalog-manifest.json",
        "--core-version",
        inventory.version,
        "--openapi",
        "catalog-openapi.json",
        "--scenario",
        "catalog-conformance.mjs"
      ],
      backendDir,
      { ...upgradeEnv, CONFORMANCE_FRONTEND_URL: `http://127.0.0.1:${browserPort}/catalog.html` }
    )
  );
  assert.equal(completeConformance.complete, true);
  assert.equal(completeConformance.status, "passed");
  assert.equal(completeConformance.scenarios.length, 9);
  assert.ok(completeConformance.scenarios.every((scenario) => scenario.status === "passed"));
  const measurements = JSON.parse(
    await readFile(join(backendDir, "catalog-measurements.json"), "utf8")
  );
  await mkdir(join(repository, ".tmp/release"), { recursive: true });
  await writeFile(
    join(repository, ".tmp/release/catalog-conformance-result.json"),
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        artifactVersion: "0.2.0",
        ...completeConformance,
        measurements,
        humanAcceptance: "pending",
        stagingAcceptance: "pending"
      },
      null,
      2
    )
  );
  console.log(
    "Nine external conformance scenarios passed, including BSON/index/media/config restore and measured six-plugin cold start"
  );
  await mkdir(join(repository, ".tmp/release"), { recursive: true });
  await writeFile(
    join(repository, ".tmp/release/external-host-result.json"),
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        version: inventory.version,
        backend: "passed",
        browser: "passed",
        reactCopies: 1,
        migrationsCli: "passed",
        externalCatalog: "passed",
        catalogBrowser: "passed",
        catalogSdkOverlay: "passed",
        catalogUpgrade: "passed",
        catalogConformanceContract: "passed",
        catalogConformanceScenarios: "passed",
        recovery: "passed-local-fixture",
        humanAcceptance: "pending",
        stagingAcceptance: "pending",
        artifacts: inventory.artifacts.map(({ manifest, files, ...rest }) => rest)
      },
      null,
      2
    )
  );
} finally {
  await browser?.close();
  for (const child of children) {
    child.kill("SIGTERM");
  }
  await Promise.all(
    [...children].map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) {
            resolve();
            return;
          }
          const timer = setTimeout(() => {
            child.kill("SIGKILL");
          }, 5000);
          child.once("exit", () => {
            clearTimeout(timer);
            resolve();
          });
        })
    )
  );
  if (catalogCleanupDirectory)
    await command(process.execPath, ["catalog-cleanup.mjs"], catalogCleanupDirectory, {
      MONGO_URI: mongoTarget.toString()
    });
  if (backendCleanupDirectory)
    await command(process.execPath, ["external-cleanup.mjs"], backendCleanupDirectory, {
      MONGO_URI: mongoTarget.toString()
    });
  if (registry) await new Promise((resolve) => registry.close(resolve));
  await rm(fixtureRoot, { recursive: true, force: true });
}
