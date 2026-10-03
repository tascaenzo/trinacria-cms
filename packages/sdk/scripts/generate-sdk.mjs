#!/usr/bin/env node
import { lstat, mkdir, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const marker = ".trinacria-sdk-generator.json";
export async function generateSdk(document, outputDir, options = {}) {
  const mode = options.mode ?? "official";
  if (!["official", "overlay"].includes(mode)) throw new Error(`Unknown generation mode: ${mode}`);
  if (mode === "overlay" && !options.owner && !options.operations?.length)
    throw new Error("Overlay requires --owner or explicit --operation selection");
  if (options.owner && options.operations?.length)
    throw new Error("Choose owner or operations, not both");
  validateDocument(document);
  const all = collectOperations(document);
  const operations = all.filter(
    (operation) =>
      mode === "official" ||
      (options.owner
        ? operation.owner === options.owner
        : options.operations.includes(operation.rawId))
  );
  if (!operations.length) throw new Error("No selected operations");
  if (options.operations)
    for (const id of options.operations)
      if (!operations.some((operation) => operation.rawId === id))
        throw new Error(`Selected operation not found: ${id}`);
  const groups = groupByTag(operations);
  const runtimeImport = mode === "overlay" ? "@trinacria-cms/sdk/runtime" : "../runtime/types.js";
  const files = new Map([
    ["types.gen.ts", renderTypesFile(document, operations)],
    ["index.ts", renderIndexFile(groups, runtimeImport, mode)]
  ]);
  for (const [tag, items] of Object.entries(groups))
    files.set(`${tag}.gen.ts`, renderGroupFile(tag, items, runtimeImport));
  const target = resolve(outputDir);
  await prepareOutput(target, [...files.keys()]);
  for (const [name, content] of files) await writeFile(join(target, name), content, "utf8");
  await writeFile(
    join(target, marker),
    JSON.stringify({ version: 1, mode, files: [...files.keys()].sort() }, null, 2) + "\n"
  );
  return { operations: operations.length, files: [...files.keys()] };
}

function targetPart(target) {
  return target.slice(dirname(target).length + 1);
}

async function prepareOutput(target, files) {
  if (
    target === parse(target).root ||
    target === process.cwd() ||
    target.split(/[\\/]/).includes("node_modules")
  )
    throw new Error(`Unsafe SDK output: ${target}`);
  const stat = await lstat(target).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return null;
  });
  if (stat?.isSymbolicLink() || (stat && !stat.isDirectory()))
    throw new Error("SDK output must be a real directory");
  let ancestor = target;
  const suffix = [];
  while (
    !(await lstat(ancestor).catch((error) => {
      if (error.code !== "ENOENT") throw error;
      return null;
    }))
  ) {
    suffix.unshift(targetPart(ancestor));
    ancestor = dirname(ancestor);
  }
  const canonical = join(await realpath(ancestor), ...suffix);
  if (
    canonical === parse(canonical).root ||
    canonical === (await realpath(process.cwd())) ||
    canonical.split(/[\\/]/).includes("node_modules")
  )
    throw new Error("Unsafe canonical SDK output");
  if (
    stat &&
    (await readdir(target)).length &&
    !(await lstat(join(target, marker)).catch(() => null))
  )
    throw new Error("Nonempty SDK output has no generator marker");
  if (
    (await lstat(join(target, "package.json")).catch(() => null)) ||
    (await lstat(join(target, ".git")).catch(() => null))
  )
    throw new Error("Cannot generate into a project root");
  const markerStat = await lstat(join(target, marker)).catch(() => null);
  if (markerStat?.isSymbolicLink()) throw new Error("Generator marker cannot be a symlink");
  const previous = markerStat
    ? JSON.parse(await readFile(join(target, marker), "utf8"))
    : { version: 1, files: [] };
  if (
    previous.version !== 1 ||
    !Array.isArray(previous.files) ||
    previous.files.some(
      (file) =>
        typeof file !== "string" || !/^(?:index\.ts|[a-zA-Z][a-zA-Z0-9]*\.gen\.ts)$/.test(file)
    )
  )
    throw new Error("Invalid generator ownership manifest");
  for (const file of new Set([...previous.files, ...files])) {
    const entry = await lstat(join(target, file)).catch(() => null);
    if (entry?.isSymbolicLink() || (entry && !entry.isFile()))
      throw new Error(`Invalid generated file: ${file}`);
    if (entry && !previous.files.includes(file))
      throw new Error(`Refusing to overwrite an unowned file: ${file}`);
  }
  await mkdir(target, { recursive: true });
  for (const file of previous.files)
    if (!files.includes(file)) await rm(join(target, file), { force: true });
}

export function validateDocument(document) {
  if (
    !document ||
    typeof document !== "object" ||
    !document.paths ||
    !/^3\./.test(document.openapi ?? "")
  )
    throw new Error("Expected an OpenAPI 3 document");
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.$ref) resolveRef(document, value.$ref);
    for (const child of Object.values(value)) visit(child);
  }
  visit(document);
}

async function runCli() {
  const args = process.argv.slice(2);
  const input = args.shift(),
    output = args.shift();
  if (!input || !output)
    throw new Error(
      "Usage: trinacria-sdk <openapi.json|explicit-url> <output-dir> [--mode official|overlay] [--owner plugin-id] [--operation operation-id]"
    );
  const options = { operations: [] };
  while (args.length) {
    const flag = args.shift(),
      value = args.shift();
    if (!value) throw new Error(`Missing value: ${flag}`);
    if (flag === "--mode") options.mode = value;
    else if (flag === "--owner") options.owner = value;
    else if (flag === "--operation") options.operations.push(value);
    else throw new Error(`Unknown flag: ${flag}`);
  }
  if (!options.operations.length) delete options.operations;
  let source;
  if (/^https?:\/\//.test(input)) {
    const response = await fetch(input, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`OpenAPI download failed: HTTP ${response.status}`);
    source = await response.text();
  } else source = await readFile(input, "utf8");
  const result = await generateSdk(JSON.parse(source), output, options);
  console.log(`Generated ${result.operations} operations (${options.mode ?? "official"})`);
}
if (
  process.argv[1] &&
  (await realpath(process.argv[1]).catch(() => "")) === fileURLToPath(import.meta.url)
)
  await runCli();

function collectOperations(document) {
  const items = [];
  const paths = document.paths ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") continue;
      if (typeof operation.operationId !== "string" || !operation.operationId)
        throw new Error(`Operation needs an ID: ${method} ${path}`);
      const rawId = operation.operationId;
      const operationId = sanitizeTypeName(rawId);
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(operationId))
        throw new Error(`Invalid operation ID: ${rawId}`);
      if (
        !Array.isArray(operation.tags) ||
        operation.tags.length !== 1 ||
        typeof operation.tags[0] !== "string"
      )
        throw new Error(`Operation needs one tag: ${rawId}`);
      const rawTag = operation.tags[0];
      const tag = sanitizeTagName(rawTag);
      if (
        !/^[A-Za-z][A-Za-z0-9]*$/.test(tag) ||
        ["constructor", "prototype", "request", "official"].includes(tag)
      )
        throw new Error(`Reserved/invalid SDK group: ${rawTag}`);
      const parameters = [
        ...pathParameters,
        ...(Array.isArray(operation.parameters) ? operation.parameters : [])
      ];
      const resolvedParameters = parameters.map((p) => (p.$ref ? resolveRef(document, p.$ref) : p));
      const pathParams = resolvedParameters.filter((parameter) => parameter?.in === "path");
      const queryParams = resolvedParameters.filter((parameter) => parameter?.in === "query");
      const requestBody = operation.requestBody?.$ref
        ? resolveRef(document, operation.requestBody.$ref)
        : operation.requestBody;
      const requestContent = selectContent(requestBody?.content);
      const requestSchema = requestContent.schema;
      const success = findSuccessSchema(document, operation.responses || {});
      const responseSchema = success.schema;

      for (const match of path.matchAll(/\{([^}]+)\}/g))
        if (!pathParams.some((p) => p.name === match[1] && p.required === true))
          throw new Error(`Required path parameter missing: ${rawId}:${match[1]}`);
      items.push({
        rawId,
        rawTag,
        owner: operation["x-cms-plugin-id"],
        method: method.toUpperCase(),
        path,
        operationId,
        tag,
        pathParams,
        queryParams,
        requestSchema,
        responseSchema,
        bodyType: requestContent.binary ? "binary" : "json",
        responseType: success.binary ? "binary" : "json",
        hasInput: pathParams.length > 0 || queryParams.length > 0 || Boolean(requestSchema),
        inputOptional:
          pathParams.length === 0 &&
          !requestSchema &&
          queryParams.length > 0 &&
          queryParams.every((parameter) => !parameter.required),
        requestTypeName: `${operationId}Request`,
        responseTypeName: `${operationId}Response`
      });
    }
  }

  const ids = new Set(),
    methods = new Set(),
    tags = new Map();
  for (const item of items) {
    const method = `${item.tag}:${camelCase(item.operationId)}`;
    if (ids.has(item.operationId) || methods.has(method))
      throw new Error(`Colliding operation IDs after sanitization: ${item.rawId}`);
    if (tags.has(item.tag) && tags.get(item.tag) !== item.rawTag)
      throw new Error(`Colliding tags after sanitization: ${item.rawTag}`);
    ids.add(item.operationId);
    methods.add(method);
    tags.set(item.tag, item.rawTag);
  }
  return items.sort((left, right) => left.operationId.localeCompare(right.operationId, "en"));
}

function renderTypesFile(document, operations) {
  const typeSections = operations.flatMap((operation) => renderOperationTypes(document, operation));

  return `/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

${typeSections.join("\n\n")}
`;
}

function renderIndexFile(groups, runtimeImport, mode) {
  const imports = Object.keys(groups)
    .map(
      (tag) =>
        `import { create${pascalCase(tag)}Api, type ${pascalCase(tag)}Api } from "./${tag}.gen.js";`
    )
    .join("\n");

  return `/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore } from "${runtimeImport}";
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

export function ${mode === "overlay" ? "createPluginSdk" : "createGeneratedCmsSdk"}(client: CmsSdkClientCore): GeneratedCmsSdk {
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
    inputFields.push(`path: ${renderObjectType(document, operation.pathParams, "path")}`);
  }
  if (operation.queryParams.length > 0) {
    inputFields.push(
      `query${operation.queryParams.every((parameter) => !parameter.required) ? "?" : ""}: ${renderObjectType(document, operation.queryParams, "query")}`
    );
  }
  if (operation.requestSchema) {
    inputFields.push(`body: ${schemaToTs(document, operation.requestSchema, new Set(), true)}`);
  }

  sections.push(
    `export type ${operation.requestTypeName} = ${
      !operation.hasInput ? "void" : `{\n${inputFields.map((field) => `  ${field};`).join("\n")}\n}`
    };`
  );

  sections.push(
    `export type ${operation.responseTypeName} = ${operation.responseSchema === null ? "void" : schemaToTs(document, operation.responseSchema)};`
  );

  return sections;
}

function renderGroupFile(tag, operations, runtimeImport) {
  const typeImports = operations
    .flatMap((operation) => [operation.requestTypeName, operation.responseTypeName])
    .join(", ");

  return `/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "${runtimeImport}";
import type { ${typeImports} } from "./types.gen.js";

export interface ${pascalCase(tag)}Api {
${operations
  .map((operation) => {
    if (!operation.hasInput) {
      return `  ${camelCase(operation.operationId)}(options?: SdkRequestOverrides): Promise<${operation.responseTypeName}>;`;
    }
    return `  ${camelCase(operation.operationId)}(input${operation.inputOptional ? "?" : ""}: ${operation.requestTypeName}, options?: SdkRequestOverrides): Promise<${operation.responseTypeName}>;`;
  })
  .join("\n")}
}

export function create${pascalCase(tag)}Api(client: CmsSdkClientCore): ${pascalCase(tag)}Api {
  return {
${operations.map((operation) => renderOperationFactory(operation)).join(",\n")}
  };
}
`;
}

function renderOperationFactory(operation) {
  const fnName = camelCase(operation.operationId);
  const inputArg = operation.hasInput ? (operation.inputOptional ? "input = {}, " : "input, ") : "";
  const pathParamsExpr = operation.pathParams.length > 0 ? "input.path" : "undefined";
  const queryExpr = operation.queryParams.length > 0 ? "input.query" : "undefined";
  const bodyExpr = operation.requestSchema ? "input.body" : "undefined";

  return `    ${fnName}: async (${inputArg}options) =>
      client.request({
        method: "${operation.method}",
        path: "${toSdkPath(operation.path)}",
        pathParams: ${pathParamsExpr},
        query: ${queryExpr},
        body: ${bodyExpr},
        bodyType: "${operation.bodyType}",
        responseType: "${operation.responseType}",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })`;
}

function renderObjectType(document, parameters) {
  return `{
${parameters
  .map((parameter) => {
    const propertyName = parameter.name;
    const type = schemaToTs(document, parameter.schema || {});
    const optional = parameter.required ? "" : "?";
    return `  ${JSON.stringify(propertyName)}${optional}: ${type};`;
  })
  .join("\n")}
}`;
}

function selectContent(content) {
  if (!content) return { schema: null, binary: false };
  for (const type of Object.keys(content))
    if (!["application/json", "application/octet-stream"].includes(type))
      throw new Error(`Unsupported SDK media type: ${type}`);
  const binary = !content["application/json"] && Boolean(content["application/octet-stream"]);
  const selected = content[binary ? "application/octet-stream" : "application/json"];
  if (!selected?.schema) throw new Error("SDK content requires a schema");
  if (binary && !(selected.schema.type === "string" && selected.schema.format === "binary"))
    throw new Error("Binary content requires string/binary schema");
  return { schema: selected.schema, binary };
}
function findSuccessSchema(document, responses) {
  const successCodes = Object.keys(responses)
    .filter((code) => /^2\d\d$/.test(code))
    .sort();
  if (!successCodes.length) throw new Error("SDK operation requires a success response");
  const content = successCodes.map((code) => {
    const value = responses[code];
    const response = value.$ref ? resolveRef(document, value.$ref) : value;
    return selectContent(response.content);
  });
  if (content.some((value) => value.binary !== content[0].binary))
    throw new Error("Mixed binary/JSON success responses are unsupported");
  const schemas = content.map((value) => value.schema);
  if (schemas.every((schema) => schema === null)) return content[0];
  if (schemas.some((schema) => schema === null))
    throw new Error("Mixed empty/body success responses are unsupported");
  return {
    schema: schemas.length === 1 ? schemas[0] : { anyOf: schemas },
    binary: content[0].binary
  };
}

function groupByTag(operations) {
  const groups = Object.create(null);

  for (const operation of operations) {
    groups[operation.tag] ??= [];
    groups[operation.tag].push(operation);
  }

  return groups;
}

export function schemaToTs(document, schema, seen = new Set(), readonlyArrays = false) {
  if (typeof schema === "boolean") return schema ? "unknown" : "never";
  if (!schema || typeof schema !== "object") throw new Error("Invalid JSON schema");
  for (const key of [
    "not",
    "if",
    "then",
    "else",
    "patternProperties",
    "unevaluatedProperties",
    "$dynamicRef",
    "prefixItems"
  ])
    if (key in schema) throw new Error(`Unsupported SDK schema construct: ${key}`);
  if (schema.nullable)
    return `(${schemaToTs(document, { ...schema, nullable: false }, seen, readonlyArrays)}) | null`;
  if (Array.isArray(schema.type))
    return schema.type
      .map((type) => schemaToTs(document, { ...schema, type }, seen, readonlyArrays))
      .join(" | ");
  if ("const" in schema) return literal(schema.const);
  if (!schema) return "unknown";

  if (schema.$ref) {
    const resolved = resolveRef(document, schema.$ref);
    if (seen.has(schema.$ref))
      throw new Error(`Recursive SDK schema is not supported: ${schema.$ref}`);
    return schemaToTs(document, resolved, new Set([...seen, schema.$ref]), readonlyArrays);
  }

  for (const key of ["oneOf", "anyOf", "allOf", "enum", "type"])
    if (Array.isArray(schema[key]) && schema[key].length === 0)
      throw new Error(`Empty SDK schema: ${key}`);
  if (schema.oneOf) {
    return schema.oneOf.map((item) => schemaToTs(document, item, seen, readonlyArrays)).join(" | ");
  }

  if (schema.anyOf) {
    return schema.anyOf.map((item) => schemaToTs(document, item, seen, readonlyArrays)).join(" | ");
  }

  if (schema.allOf) {
    return schema.allOf.map((item) => schemaToTs(document, item, seen, readonlyArrays)).join(" & ");
  }

  if (schema.enum) {
    return schema.enum.map((item) => literal(item)).join(" | ");
  }

  if (schema.type === "object" || schema.properties || schema.additionalProperties) {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const lines = Object.entries(properties).map(([name, value]) => {
      const optional = required.has(name) ? "" : "?";
      return `  ${JSON.stringify(name)}${optional}: ${schemaToTs(document, value, seen, readonlyArrays)};`;
    });

    if (schema.additionalProperties === true) {
      lines.push("  [key: string]: unknown;");
    } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      lines.push(
        `  [key: string]: ${schemaToTs(document, schema.additionalProperties, seen, readonlyArrays)};`
      );
    }

    if (lines.length === 0) {
      return schema.additionalProperties === false
        ? "Record<string, never>"
        : "Record<string, unknown>";
    }

    return `{\n${lines.join("\n")}\n}`;
  }

  if (schema.type === "array") {
    return `${readonlyArrays ? "ReadonlyArray" : "Array"}<${schemaToTs(document, schema.items || {}, seen, readonlyArrays)}>`;
  }

  if (schema.type === "string") return schema.format === "binary" ? "Uint8Array" : "string";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "null") return "null";

  if (schema.type !== undefined) throw new Error(`Unsupported SDK schema type: ${schema.type}`);
  if (
    Object.keys(schema).some(
      (key) =>
        ![
          "description",
          "title",
          "example",
          "examples",
          "default",
          "deprecated",
          "readOnly",
          "writeOnly"
        ].includes(key) && !key.startsWith("x-")
    )
  )
    throw new Error("Unsupported untyped SDK schema");
  return "unknown";
}

function resolveRef(document, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/"))
    throw new Error(`Only local JSON pointers are supported: ${ref}`);
  const parts = ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  let current = document;
  for (const part of parts) {
    current = current?.[part];
  }
  if (current === undefined) throw new Error(`Unresolved SDK schema ref: ${ref}`);
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
  if (value !== null && !["string", "number", "boolean"].includes(typeof value))
    throw new Error("Unsupported SDK literal");
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}
