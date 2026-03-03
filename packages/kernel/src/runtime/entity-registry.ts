import { DbAdapterError } from "../errors/db-errors.js";
import type { Schema } from "@trinacria/schema";

export interface EntityIndexDefinition {
  fields: Record<string, 1 | -1>;
  unique?: boolean;
  sparse?: boolean;
  name?: string;
}

export interface EntityDefinition {
  entityName: string;
  /**
   * Canonical data schema declaration (transport and storage agnostic).
   */
  schema: Schema<unknown>;
  /**
   * Logical indexes requested by the entity.
   * Storage adapters can translate them to backend-specific index commands.
   */
  indexes?: readonly EntityIndexDefinition[];
}

/**
 * Helper to declare a canonical entity in a single place (schema + metadata).
 * Keeps plugin code concise and avoids separate schema/entity duplication.
 */
export function defineEntity<TSchema extends Schema<unknown>>(
  definition: {
    entityName: string;
    schema: TSchema;
    indexes?: readonly EntityIndexDefinition[];
  },
): {
  entityName: string;
  schema: TSchema;
  indexes?: readonly EntityIndexDefinition[];
} {
  return definition;
}

/**
 * Registry that maps kernel entity names to canonical schema metadata.
 */
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
      indexes: definition.indexes ?? [],
    });
  }

  get(entityName: string): EntityDefinition {
    const definition = this.entities.get(entityName);
    if (!definition) {
      throw new DbAdapterError(`No entity definition found for "${entityName}"`, {
        entityName,
      });
    }
    return definition;
  }
}
