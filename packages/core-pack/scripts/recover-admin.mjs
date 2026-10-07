#!/usr/bin/env node
import { createMongoDbAdapter, EntityRegistry } from "@trinacria-cms/kernel/runtime";
import mongoose from "mongoose";
import { AUTH_FLOW_TOKENS_ENTITY } from "../dist/modules/auth/auth-flow-tokens.schemas.js";
import {
  AUTH_MFA_CHALLENGES_ENTITY,
  AUTH_MFA_CREDENTIALS_ENTITY
} from "../dist/modules/auth/auth-mfa.schemas.js";
import { LOCAL_CREDENTIALS_ENTITY } from "../dist/modules/installation/installation.schemas.js";
import { PERMISSIONS_ENTITY } from "../dist/modules/permissions/permissions.schemas.js";
import { ROLES_ENTITY } from "../dist/modules/roles/roles.schemas.js";
import { recoverAdministrator } from "../dist/modules/security/services/admin-recovery.service.js";
import { SETTINGS_ENTITY } from "../dist/modules/settings/schemas/settings.schemas.js";
import { USERS_ENTITY } from "../dist/modules/users/users.schemas.js";

const args = process.argv.slice(2),
  flags = new Map();
while (args.length) {
  const flag = args.shift();
  if (!["--email", "--database", "--reset-mfa"].includes(flag) || flags.has(flag))
    throw new Error(
      "Usage: cms-recover-admin --database database-name --email existing@email [--reset-mfa]; password on stdin, MONGO_URI in environment"
    );
  flags.set(flag, flag === "--reset-mfa" ? true : args.shift());
}
if (
  !process.env.MONGO_URI ||
  typeof flags.get("--database") !== "string" ||
  typeof flags.get("--email") !== "string"
)
  throw new Error("Explicit database, existing email and MONGO_URI required");
if (process.stdin.isTTY)
  throw new Error("Supply the new password on stdin; never pass it as an argument");
let secret = "";
for await (const chunk of process.stdin) {
  secret += chunk.toString();
  if (secret.length > 204) throw new Error("Password exceeds maximum length");
}
const password = secret.replace(/\r?\n$/, "");
const connection = await mongoose
  .createConnection(process.env.MONGO_URI, { dbName: flags.get("--database") })
  .asPromise();
try {
  const registry = new EntityRegistry();
  for (const entity of [
    USERS_ENTITY,
    ROLES_ENTITY,
    PERMISSIONS_ENTITY,
    SETTINGS_ENTITY,
    LOCAL_CREDENTIALS_ENTITY,
    AUTH_MFA_CREDENTIALS_ENTITY,
    AUTH_MFA_CHALLENGES_ENTITY,
    AUTH_FLOW_TOKENS_ENTITY
  ])
    registry.register(entity);
  const db = createMongoDbAdapter({ connection, entityRegistry: registry });
  const result = await recoverAdministrator(db, {
    email: flags.get("--email"),
    password,
    resetMfa: flags.has("--reset-mfa")
  });
  console.log(
    JSON.stringify({ recovered: result.userId, email: result.email, resetMfa: result.resetMfa })
  );
} finally {
  await connection.close();
}
