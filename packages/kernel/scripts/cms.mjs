#!/usr/bin/env node
import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [area, command, ...arguments_] = process.argv.slice(2);
if (
  !(
    (area === "migrations" && ["plan", "apply", "status"].includes(command)) ||
    (area === "plugins" && command === "deploy")
  )
)
  throw new Error(
    "Usage: cms migrations plan|apply|status --host ./deploy-host.mjs --plugin plugin-id [--backup reference --allow-destructive --resume]"
  );
const flags = new Map();
while (arguments_.length) {
  const key = arguments_.shift();
  if (
    ![
      "--host",
      "--plugin",
      "--backup",
      "--allow-destructive",
      "--resume",
      "--expected-revision"
    ].includes(key) ||
    flags.has(key)
  )
    throw new Error(`Invalid/repeated flag: ${key}`);
  flags.set(key, ["--allow-destructive", "--resume"].includes(key) ? true : arguments_.shift());
}
if (typeof flags.get("--host") !== "string" || typeof flags.get("--plugin") !== "string")
  throw new Error("Explicit trusted deploy host and plugin ID required");
const root = await realpath(process.cwd());
const file = await realpath(resolve(root, flags.get("--host")));
const path = relative(root, file);
if (path.startsWith("..") || isAbsolute(path) || !/\.[cm]?js$/.test(file))
  throw new Error("Deploy host must be a compiled local module inside the deploy directory");
const { createMigrationDeployHost } = await import(pathToFileURL(file).href);
if (typeof createMigrationDeployHost !== "function")
  throw new Error("Deploy host must export createMigrationDeployHost()");
const host = await createMigrationDeployHost();
try {
  const plugin = await host.getPlugin(flags.get("--plugin"));
  if (!plugin || plugin.manifest.id !== flags.get("--plugin"))
    throw new Error("Unknown migration owner");
  const namespace = plugin.namespace ?? { pluginId: plugin.manifest.id };
  if (area === "plugins") {
    const token = process.env.CMS_OPERATOR_TOKEN;
    if (!token) throw new Error("CMS_OPERATOR_TOKEN required for deploy");
    const operator = await host.authenticateOperator(token);
    if (!operator?.actorId || operator.canDeploy !== true)
      throw new Error("Operator deploy permission denied");
    const revision = Number(flags.get("--expected-revision"));
    if (!Number.isSafeInteger(revision) || revision < 1 || !host.cluster)
      throw new Error("Explicit desired revision and deploy cluster coordinator required");
    const result = await host.cluster.adoptDeployedArtifact(
      plugin.manifest.id,
      revision,
      operator.actorId,
      async () => {
        await host.runner.assertSchemaCompatible(plugin.manifest, namespace);
        await host.runner.verifyAppliedIntegrity(
          plugin.manifest,
          plugin.migrations ?? [],
          namespace,
          true
        );
      }
    );
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "plan")
    console.log(
      JSON.stringify(
        await host.runner.plan(plugin.manifest, plugin.migrations ?? [], namespace),
        null,
        2
      )
    );
  else if (command === "status")
    console.log(JSON.stringify(await host.runner.status(namespace), null, 2));
  else {
    const token = process.env.CMS_OPERATOR_TOKEN;
    if (!token) throw new Error("CMS_OPERATOR_TOKEN required for apply");
    // Host validates a real operator identity and deploy permission; no self-issued CLI principal.
    const operator = await host.authenticateOperator(token);
    if (!operator?.actorId || operator.canMigrate !== true)
      throw new Error("Operator migration permission denied");
    if (plugin.migrations?.some((step) => step.destructive) && flags.get("--backup")) {
      if (typeof host.verifyBackupReference !== "function")
        throw new Error("Deploy host must verify destructive backup references");
      await host.verifyBackupReference(flags.get("--backup"), plugin.manifest.id);
    }
    await host.runner.apply(
      plugin.manifest,
      plugin.migrations ?? [],
      {
        actorId: operator.actorId,
        artifactVersion: plugin.artifactVersion,
        artifactChecksum: plugin.artifactChecksum,
        backupReference: flags.get("--backup"),
        allowDestructive: flags.get("--allow-destructive") === true,
        resumeFailed: flags.get("--resume") === true
      },
      namespace
    );
    console.log(
      "Migration plan applied; maintenance remains active until deploy readiness is verified"
    );
  }
} finally {
  await host.close();
}
