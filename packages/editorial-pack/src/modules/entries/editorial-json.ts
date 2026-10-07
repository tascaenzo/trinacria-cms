import { createSchema } from "@trinacria/schema/dist/core/index.js";
import { isJsonValue } from "@trinacria-cms/core-pack/runtime";

/** Dynamic model fields stay JSON objects; the content model validates their business shape. */
export const EditorialJsonObjectSchema = createSchema<Record<string, unknown>>(
  "editorial-json-object",
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value) || !isJsonValue(value)) {
      throw new Error("Editorial data must be a JSON object");
    }
    return value as Record<string, unknown>;
  },
  () => ({ type: "object", additionalProperties: true })
);
