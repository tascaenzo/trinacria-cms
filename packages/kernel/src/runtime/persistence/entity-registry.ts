import type { Schema } from "@trinacria/schema";
import { DbAdapterError } from "../../errors/db-errors.js";

export interface EntityIndexDefinition {
  fields: Record<string, 1 | -1>;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilter?: Record<string, unknown>;
  name?: string;
}

export interface EntityDefinition {
  ownerPluginId: string;
  entityName: string;
  schema: Schema<unknown>;
  indexes?: readonly EntityIndexDefinition[];
}

export function defineEntity<TSchema extends Schema<unknown>>(definition: {
  ownerPluginId: string;
  entityName: string;
  schema: TSchema;
  indexes?: readonly EntityIndexDefinition[];
}): {
  ownerPluginId: string;
  entityName: string;
  schema: TSchema;
  indexes?: readonly EntityIndexDefinition[];
} {
  return definition;
}

export class EntityRegistry {
  private readonly entities = new Map<string, EntityDefinition>();

  register(definition: EntityDefinition): void {
    const entityName = definition.entityName.trim();
    if (!entityName || entityName !== definition.entityName) {
      throw new DbAdapterError("Entity name is required");
    }
    if (!definition.schema) {
      throw new DbAdapterError(`Schema is required for "${entityName}"`);
    }

    const ownerPluginId = definition.ownerPluginId;
    if (!ownerPluginId || !/^[a-z0-9][a-z0-9._/-]*$/.test(ownerPluginId)) {
      throw new DbAdapterError("Canonical entity owner is required");
    }
    const key = JSON.stringify([ownerPluginId, entityName]);
    const existing = this.entities.get(key);
    if (existing && existing.schema !== definition.schema) {
      throw new DbAdapterError("Entity definition is already registered for this owner", {
        ownerPluginId,
        entityName
      });
    }
    this.entities.set(key, {
      ...definition,
      entityName,
      indexes: definition.indexes ?? []
    });
  }

  get(entityName: string, ownerPluginId: string): EntityDefinition {
    const definition = this.entities.get(JSON.stringify([ownerPluginId, entityName]));
    if (!definition) {
      throw new DbAdapterError(`No entity definition found for "${entityName}"`, {
        entityName
      });
    }
    return definition;
  }
}
