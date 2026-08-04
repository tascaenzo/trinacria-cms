import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["packages/trinacria-ui/src/components", "packages/trinacria-ui/src/shell"];
const missingStories = [];

for (const root of roots) {
  for (const file of walk(root)) {
    if (!file.endsWith(".tsx") || file.endsWith(".test.tsx") || file.endsWith(".stories.tsx")) {
      continue;
    }
    const story = file.replace(/\.tsx$/, ".stories.tsx");
    if (!existsSync(story)) missingStories.push(relative(".", file));
  }
}

if (missingStories.length > 0) {
  console.error("Every reusable Trinacria UI component must include a Storybook story:");
  console.error(missingStories.join("\n"));
  process.exitCode = 1;
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return [path];
  });
}
