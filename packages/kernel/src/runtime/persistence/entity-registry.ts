import { DbAdapterError } from "../../errors/db-errors.js";
import type { Schema } from "@trinacria/schema";

export interface EntityIndexDefinition {
  fields: Record<string, 1 | -1>;
  unique?: boolean;
  sparse?: boolean;
  name?: string;
}

export interface EntityDefinition {
  entityName: string;
  schema: Schema<unknown>;
  indexes?: readonly EntityIndexDefinition[];
}

export function defineEntity<TSchema extends Schema<unknown>>(definition: {
  entityName: string;
  schema: TSchema;
  indexes?: readonly EntityIndexDefinition[];
}): {
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
    if (!entityName) {
      throw new DbAdapterError("Entity name is required");
    }
    if (!definition.schema) {
      throw new DbAdapterError(`Schema is required for "${entityName}"`);
    }

    this.entities.set(entityName, {
      ...definition,
      entityName,
      indexes: definition.indexes ?? []
    });
  }

  get(entityName: string): EntityDefinition {
    const definition = this.entities.get(entityName);
    if (!definition) {
      throw new DbAdapterError(`No entity definition found for "${entityName}"`, {
        entityName
      });
    }
    return definition;
  }
}
