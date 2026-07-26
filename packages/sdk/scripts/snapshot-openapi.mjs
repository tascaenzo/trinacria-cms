import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(currentDir, "..");
const outputPath = resolve(packageDir, "openapi", "trinacria-cms.openapi.json");

const sourceUrl =
  process.argv[2]?.trim() ||
  process.env.CMS_OPENAPI_URL?.trim() ||
  "http://127.0.0.1:3000/openapi.json";

const response = await fetch(sourceUrl, {
  headers: {
    accept: "application/json"
  }
});

if (!response.ok) {
  throw new Error(`Unable to download OpenAPI document from ${sourceUrl}: HTTP ${response.status}`);
}

const body = await response.text();
const document = JSON.parse(body);
const normalized = normalizeOpenApiDocument(document);

await mkdir(resolve(packageDir, "openapi"), { recursive: true });
await writeFile(outputPath, JSON.stringify(normalized, null, 2), "utf8");

console.log(`[sdk:snapshot] OpenAPI snapshot updated from ${sourceUrl}`);
console.log(`[sdk:snapshot] Output: ${outputPath}`);

function normalizeOpenApiDocument(document) {
  const cloned = cloneJsonDocument(document);

  patchQueryParameters(cloned, "/v1/users", "get", [
    integerQueryParameter("limit", { minimum: 1, maximum: 200 }),
    integerQueryParameter("offset", { minimum: 0 })
  ]);
  patchQueryParameters(cloned, "/v1/roles", "get", [
    integerQueryParameter("limit", { minimum: 1, maximum: 200 }),
    integerQueryParameter("offset", { minimum: 0 })
  ]);
  patchQueryParameters(cloned, "/v1/permissions", "get", [
    integerQueryParameter("limit", { minimum: 1, maximum: 200 }),
    integerQueryParameter("offset", { minimum: 0 })
  ]);
  patchQueryParameters(cloned, "/v1/api-keys", "get", [
    enumQueryParameter("kind", ["publishable", "secret", "service"]),
    enumQueryParameter("status", ["active", "revoked"]),
    integerQueryParameter("limit", { minimum: 1, maximum: 200 }),
    integerQueryParameter("offset", { minimum: 0 })
  ]);
  patchQueryParameters(cloned, "/v1/settings/definitions", "get", [
    stringQueryParameter("ownerPluginId"),
    integerQueryParameter("limit", { minimum: 1, maximum: 200 }),
    integerQueryParameter("offset", { minimum: 0 })
  ]);

  return cloned;
}

function cloneJsonDocument(document) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(document);
  }

  return JSON.parse(JSON.stringify(document));
}

function patchQueryParameters(document, path, method, parameters) {
  const operation = document?.paths?.[path]?.[method];
  if (!operation || typeof operation !== "object") {
    return;
  }

  const current = Array.isArray(operation.parameters) ? operation.parameters : [];
  const byKey = new Map(
    current.map((parameter) => [`${parameter.in}:${parameter.name}`, parameter])
  );

  for (const parameter of parameters) {
    byKey.set(`${parameter.in}:${parameter.name}`, parameter);
  }

  operation.parameters = [...byKey.values()];
}

function integerQueryParameter(name, schema = {}) {
  return {
    name,
    in: "query",
    required: false,
    schema: {
      type: "integer",
      ...schema
    }
  };
}

function stringQueryParameter(name) {
  return {
    name,
    in: "query",
    required: false,
    schema: {
      type: "string"
    }
  };
}

function enumQueryParameter(name, values) {
  return {
    name,
    in: "query",
    required: false,
    schema: {
      type: "string",
      enum: values
    }
  };
}
