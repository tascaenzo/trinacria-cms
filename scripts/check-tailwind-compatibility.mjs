import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const roots = ["apps/backoffice/src", "packages", "examples"];
const excluded = new Set([
  "dist",
  "node_modules",
  "storybook-static",
  ".storybook-home",
  "generated"
]);
const patterns = [
  ["removed opacity utility", /\b(?:bg|text|border|divide|ring|placeholder)-opacity-\d+/g],
  [
    "legacy utility",
    /(?<![\w-])(?:flex-(?:shrink|grow)(?:-\d+)?|overflow-ellipsis|decoration-(?:clone|slice)|bg-gradient-to-[a-z]+|break-words|outline-none)(?![\w-])/g
  ],
  [
    "expanded token utility (use utility-(--token))",
    /[a-z-]+-\[(?:color:)?var\(--[a-zA-Z0-9_-]+\)\]/g
  ],
  ["v3 directive", /@tailwind\s+(?:base|components|utilities)\b/g]
];
const violations = [];
let checked = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    if (!/\.(?:tsx?|mdx|css)$/.test(file) || /\.(?:test|spec)\./.test(file)) continue;
    checked++;
    const source = readFileSync(file, "utf8");
    for (const [reason, pattern] of patterns) {
      for (const match of source.matchAll(pattern)) {
        const line = source.slice(0, match.index).split("\n").length;
        violations.push(`${file}:${line}: ${reason}: ${match[0]}`);
      }
    }
  }
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Verified current Tailwind syntax in ${checked} source files.`);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (excluded.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
