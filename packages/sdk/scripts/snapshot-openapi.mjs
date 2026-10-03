import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDocument } from "./generate-sdk.mjs";

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
  },
  signal: AbortSignal.timeout(15000)
});

if (!response.ok) {
  throw new Error(`Unable to download OpenAPI document from ${sourceUrl}: HTTP ${response.status}`);
}

const body = await response.text();
const document = JSON.parse(body);
validateDocument(document);

await mkdir(resolve(packageDir, "openapi"), { recursive: true });
await writeFile(outputPath, JSON.stringify(document, null, 2), "utf8");

console.log(`[sdk:snapshot] OpenAPI snapshot updated from ${sourceUrl}`);
console.log(`[sdk:snapshot] Output: ${outputPath}`);
