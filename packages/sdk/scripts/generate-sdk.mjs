import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [, , inputPath, outputDir] = process.argv;

if (!inputPath || !outputDir) {
  throw new Error(
    "Usage: node ./scripts/generate-sdk.mjs <openapi.json> <output-dir>",
  );
}

const document = JSON.parse(await readFile(inputPath, "utf8"));
const operations = collectOperations(document);
const groups = groupByTag(operations);

await mkdir(outputDir, { recursive: true });
await cleanupGeneratedFiles(outputDir);
await writeFile(join(outputDir, "types.gen.ts"), renderTypesFile(document, operations), "utf8");
await writeFile(join(outputDir, "index.ts"), renderIndexFile(groups), "utf8");

for (const [tag, items] of Object.entries(groups)) {
  await writeFile(
    join(outputDir, `${tag}.gen.ts`),
    renderGroupFile(tag, items),
    "utf8",
  );
}

function collectOperations(document) {
  const items = [];
  const paths = document.paths ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") continue;
      const operationId = sanitizeTypeName(
        operation.operationId || `${method}_${path}`,
      );
      const tag = sanitizeTagName(operation.tags?.[0] || "default");
      const parameters = [...pathParameters, ...(Array.isArray(operation.parameters) ? operation.parameters : [])];
      const pathParams = parameters.filter((parameter) => parameter?.in === "path");
      const queryParams = parameters.filter((parameter) => parameter?.in === "query");
      const requestSchema =
        operation.requestBody?.content?.["application/json"]?.schema || null;
      const responseSchema = findSuccessSchema(operation.responses || {});

      items.push({
        method: method.toUpperCase(),
        path,
        operationId,
        tag,
        pathParams,
        queryParams,
        requestSchema,
        responseSchema,
        hasInput:
          pathParams.length > 0 ||
          queryParams.length > 0 ||
          Boolean(requestSchema),
        requestTypeName: `${operationId}Request`,
        responseTypeName: `${operationId}Response`,
      });
    }
  }

  return items.sort((left, right) => left.operationId.localeCompare(right.operationId));
}

async function cleanupGeneratedFiles(outputDir) {
  const entries = await readdir(outputDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".gen.ts") && entry.name !== "index.ts") continue;
    await rm(join(outputDir, entry.name));
  }
}

function renderTypesFile(document, operations) {
  const typeSections = operations.flatMap((operation) =>
    renderOperationTypes(document, operation),
  );

  return `/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

${typeSections.join("\n\n")}
`;
}

function renderIndexFile(groups) {
  const imports = Object.keys(groups)
    .map(
      (tag) =>
        `import { create${pascalCase(tag)}Api, type ${pascalCase(tag)}Api } from "./${tag}.gen.js";`,
    )
    .join("\n");

  return `/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore } from "../runtime/types.js";
${imports}
export * from "./types.gen.js";
${Object.keys(groups)
  .map((tag) => `export type { ${pascalCase(tag)}Api } from "./${tag}.gen.js";`)
  .join("\n")}

export interface GeneratedCmsSdk {
${Object.keys(groups)
  .map((tag) => `  ${tag}: ${pascalCase(tag)}Api;`)
  .join("\n")}
}

export function createGeneratedCmsSdk(client: CmsSdkClientCore): GeneratedCmsSdk {
  return {
${Object.keys(groups)
  .map((tag) => `    ${tag}: create${pascalCase(tag)}Api(client),`)
  .join("\n")}
  };
}
`;
}

function renderOperationTypes(document, operation) {
  const sections = [];
  const inputFields = [];

  if (operation.pathParams.length > 0) {
    inputFields.push(
      `path: ${renderObjectType(document, operation.pathParams, "path")}`,
    );
  }
  if (operation.queryParams.length > 0) {
    inputFields.push(
      `query: ${renderObjectType(document, operation.queryParams, "query")}`,
    );
  }
  if (operation.requestSchema) {
    inputFields.push(`body: ${schemaToTs(document, operation.requestSchema)}`);
  }

  sections.push(
    `export type ${operation.requestTypeName} = ${
      !operation.hasInput
        ? "void"
        : `{\n${inputFields.map((field) => `  ${field};`).join("\n")}\n}`
    };`,
  );

  sections.push(
    `export type ${operation.responseTypeName} = ${schemaToTs(
      document,
      operation.responseSchema,
    )};`,
  );

  return sections;
}

function renderGroupFile(tag, operations) {
  const typeImports = operations
    .flatMap((operation) => [operation.requestTypeName, operation.responseTypeName])
    .join(", ");

  return `/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { ${typeImports} } from "./types.gen.js";

export interface ${pascalCase(tag)}Api {
${operations
  .map((operation) => {
    if (!operation.hasInput) {
      return `  ${camelCase(operation.operationId)}(options?: SdkRequestOverrides): Promise<${operation.responseTypeName}>;`;
    }
    return `  ${camelCase(operation.operationId)}(input: ${operation.requestTypeName}, options?: SdkRequestOverrides): Promise<${operation.responseTypeName}>;`;
  })
  .join("\n")}
}

export function create${pascalCase(tag)}Api(client: CmsSdkClientCore): ${pascalCase(tag)}Api {
  return {
${operations
  .map((operation) => renderOperationFactory(operation))
  .join(",\n")}
  };
}
`;
}

function renderOperationFactory(operation) {
  const fnName = camelCase(operation.operationId);
  const inputArg = operation.hasInput ? "input, " : "";
  const pathParamsExpr =
    operation.pathParams.length > 0 ? "input.path" : "undefined";
  const queryExpr =
    operation.queryParams.length > 0 ? "input.query" : "undefined";
  const bodyExpr = operation.requestSchema ? "input.body" : "undefined";

  return `    ${fnName}: async (${inputArg}options) =>
      client.request({
        method: "${operation.method}",
        path: "${toSdkPath(operation.path)}",
        pathParams: ${pathParamsExpr},
        query: ${queryExpr},
        body: ${bodyExpr},
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })`;
}

function renderObjectType(document, parameters) {
  return `{
${parameters
  .map((parameter) => {
    const propertyName = sanitizePropertyName(parameter.name);
    const type = schemaToTs(document, parameter.schema || {});
    const optional = parameter.required ? "" : "?";
    return `  ${JSON.stringify(propertyName)}${optional}: ${type};`;
  })
  .join("\n")}
}`;
}

function findSuccessSchema(responses) {
  const successCode = Object.keys(responses)
    .filter((code) => /^2\d\d$/.test(code))
    .sort()[0];

  if (!successCode) {
    return { type: "null" };
  }

  const response = responses[successCode];
  const schema = response?.content?.["application/json"]?.schema;
  if (schema) return schema;
  return { type: "null" };
}

function groupByTag(operations) {
  const groups = {};

  for (const operation of operations) {
    groups[operation.tag] ??= [];
    groups[operation.tag].push(operation);
  }

  return groups;
}

function schemaToTs(document, schema) {
  if (!schema) return "unknown";

  if (schema.$ref) {
    const resolved = resolveRef(document, schema.$ref);
    return schemaToTs(document, resolved);
  }

  if (schema.oneOf) {
    return schema.oneOf.map((item) => schemaToTs(document, item)).join(" | ");
  }

  if (schema.anyOf) {
    return schema.anyOf.map((item) => schemaToTs(document, item)).join(" | ");
  }

  if (schema.allOf) {
    return schema.allOf.map((item) => schemaToTs(document, item)).join(" & ");
  }

  if (schema.enum) {
    return schema.enum.map((item) => literal(item)).join(" | ");
  }

  if (schema.type === "object" || schema.properties || schema.additionalProperties) {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const lines = Object.entries(properties).map(([name, value]) => {
      const optional = required.has(name) ? "" : "?";
      return `  ${JSON.stringify(name)}${optional}: ${schemaToTs(document, value)};`;
    });

    if (schema.additionalProperties === true) {
      lines.push("  [key: string]: unknown;");
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      lines.push(
        `  [key: string]: ${schemaToTs(document, schema.additionalProperties)};`,
      );
    }

    if (lines.length === 0) {
      return "Record<string, unknown>";
    }

    return `{\n${lines.join("\n")}\n}`;
  }

  if (schema.type === "array") {
    return `Array<${schemaToTs(document, schema.items || {})}>`;
  }

  if (schema.type === "string") return "string";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "null") return "null";

  return "unknown";
}

function resolveRef(document, ref) {
  const parts = ref.replace(/^#\//, "").split("/");
  let current = document;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}

function toSdkPath(path) {
  return path.replace(/\{([^}]+)\}/g, ":$1");
}

function sanitizeTagName(value) {
  return camelCase(value.replace(/[^a-zA-Z0-9]+/g, " "));
}

function sanitizeTypeName(value) {
  return pascalCase(value.replace(/[^a-zA-Z0-9]+/g, " "));
}

function sanitizePropertyName(value) {
  return value.replace(/[^a-zA-Z0-9_]+/g, "_");
}

function pascalCase(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function camelCase(value) {
  const normalized = pascalCase(value);
  return normalized.charAt(0).toLowerCase() + normalized.slice(1);
}

function literal(value) {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}
