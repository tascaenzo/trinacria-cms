import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const roots = [
  "packages/admin-kernel/src",
  "packages/editorial-pack/src/admin",
  "packages/email-pack/src/admin",
  "packages/media-pack/src/admin"
];

const nonCanonicalSaveLabels = [
  "Salva campo",
  "Salva contenuto",
  "Salva layout",
  "Salva modifiche",
  "Salva modello",
  "Salva profilo",
  "Save changes",
  "Save content",
  "Save field",
  "Save layout",
  "Save model",
  "Save profile"
];

const violations = [];

for (const root of roots) {
  for (const file of walk(root)) {
    if (!file.endsWith(".tsx")) continue;
    const contents = readFileSync(file, "utf8");
    const labels = nonCanonicalSaveLabels.filter((label) => contents.includes(label));
    if (labels.length > 0) violations.push(`${file}: ${labels.join(", ")}`);
  }
}

if (violations.length > 0) {
  console.error('Use the canonical "Salva"/"Save" label for actions that persist modifications:');
  console.error(violations.join("\n"));
  process.exitCode = 1;
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return [relative(".", path)];
  });
}
