import type { DbClient, NamespacedDbFactory } from "../contracts/db";

function sanitizeNamespace(input: string): string {
  if (!/^[a-z0-9-_]+$/i.test(input)) {
    throw new Error(
      `Invalid plugin namespace "${input}". Allowed characters: letters, numbers, "-" and "_".`
    );
  }

  return input.toLowerCase();
}

function isNamespacedDbFactory(input: unknown): input is NamespacedDbFactory {
  if (!input || typeof input !== "object") {
    return false;
  }

  return typeof (input as NamespacedDbFactory).forNamespace === "function";
}

export function createPluginScopedDbClient(db: unknown, pluginId: string): DbClient {
  const namespace = sanitizeNamespace(pluginId);

  if (isNamespacedDbFactory(db)) {
    return db.forNamespace(namespace);
  }

  const baseClient = db as DbClient;

  if (!baseClient || typeof baseClient.collection !== "function") {
    throw new Error("Invalid DB provider. Expected DbClient or NamespacedDbFactory.");
  }

  return {
    collection(name) {
      return baseClient.collection(`${namespace}__${name}`);
    }
  };
}
