import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CONSOLE_METHODS = ["log", "info", "warn", "error"] as const;

export function installBackendLogCapture(path: string): void {
  const absolutePath = resolve(process.cwd(), path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, "", "utf8");

  for (const method of CONSOLE_METHODS) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      appendFileSync(absolutePath, `${serializeLogArguments(args)}\n`, "utf8");
      original(...args);
    };
  }
}

function serializeLogArguments(args: readonly unknown[]): string {
  return args
    .map((value) => {
      if (typeof value === "string") return value;
      if (value instanceof Error) {
        return JSON.stringify({ name: value.name, message: value.message, stack: value.stack });
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    })
    .join(" ");
}
