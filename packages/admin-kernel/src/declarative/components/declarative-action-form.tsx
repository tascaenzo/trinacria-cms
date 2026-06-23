import {
  Badge,
  Checkbox,
  Combobox,
  IconButton,
  Input,
  NumberInput,
  Select,
  Textarea
} from "@trinacria-cms/trinacria-ui";
import { useState } from "react";
import type { AdminEndpointBinding, AdminEndpointPolicyHint } from "../../contracts.js";
import type { TranslateFn } from "../../lib/i18n.js";
import { toDisplayError } from "../../lib/sdk-errors.js";
import { validateAdminEndpointBinding } from "../../runtime/admin-endpoint-policy.js";
import { cms } from "../../runtime/cms-sdk.js";
import type { DeclarativeAction, DeclarativeActionContext } from "../types.js";
import { humanizeKey } from "../utils/formatting.js";
import { isObject, readObjectPath } from "../utils/object-path.js";
import { createSchemaSample } from "../utils/schema.js";

export type DraftFieldValue = string | boolean | string[];

export interface DeclarativeActionOption {
  value: string;
  label: string;
  description?: string;
  meta?: string;
}

export interface DeclarativeActionOptionSource {
  endpoint: AdminEndpointBinding;
  valuePath?: string;
  valueField?: string;
  labelField?: string;
  descriptionField?: string;
  metaField?: string;
  policy?: AdminEndpointPolicyHint;
}

export interface DeclarativeActionFormFieldDefinition {
  key: string;
  label: string;
  kind: "text" | "number" | "boolean" | "json" | "stringArray";
  required: boolean;
  options?: readonly DeclarativeActionOption[];
  optionSource?: DeclarativeActionOptionSource;
}

export interface DeclarativeActionOptionState {
  status: "idle" | "loading" | "success" | "error";
  options: readonly DeclarativeActionOption[];
  error?: string;
}

export function DeclarativeActionFormField({
  field,
  onChange,
  optionState,
  value
}: {
  field: DeclarativeActionFormFieldDefinition;
  onChange: (value: DraftFieldValue) => void;
  optionState?: DeclarativeActionOptionState;
  value: DraftFieldValue;
}) {
  if (field.kind === "stringArray") {
    return (
      <StringArraySelectField
        field={field}
        onChange={onChange}
        optionState={optionState}
        value={Array.isArray(value) ? value : []}
      />
    );
  }

  if (field.options?.length) {
    return (
      <Select
        label={field.label}
        name={field.key}
        required={field.required}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {!field.required ? <option value="">-</option> : null}
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }

  if (field.kind === "boolean") {
    return (
      <Checkbox
        checked={Boolean(value)}
        label={field.label}
        name={field.key}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }

  if (field.kind === "number") {
    return (
      <NumberInput
        label={field.label}
        name={field.key}
        required={field.required}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.kind === "json") {
    return (
      <Textarea
        label={field.label}
        name={field.key}
        required={field.required}
        rows={6}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input
      label={field.label}
      name={field.key}
      required={field.required}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function StringArraySelectField({
  field,
  onChange,
  optionState,
  value
}: {
  field: DeclarativeActionFormFieldDefinition;
  onChange: (value: DraftFieldValue) => void;
  optionState?: DeclarativeActionOptionState;
  value: string[];
}) {
  const [candidate, setCandidate] = useState("");
  const sourceOptions = optionState?.options ?? field.options ?? [];
  const options = sourceOptions.map((option) => ({
    ...option,
    disabled: value.includes(option.value)
  }));
  const selectedOptions = value.map(
    (selectedValue) =>
      sourceOptions.find((option) => option.value === selectedValue) ?? {
        value: selectedValue,
        label: selectedValue
      }
  );

  function addValue(nextValue: string) {
    if (!nextValue || value.includes(nextValue)) {
      setCandidate("");
      return;
    }
    onChange([...value, nextValue]);
    setCandidate("");
  }

  function removeValue(nextValue: string) {
    onChange(value.filter((item) => item !== nextValue));
  }

  return (
    <div className="grid gap-2">
      <Combobox
        allowClear
        emptyText={
          optionState?.status === "loading"
            ? "Loading options..."
            : optionState?.status === "error"
              ? "Unable to load options."
              : "No options found."
        }
        label={field.label}
        options={options}
        placeholder="Select an option"
        searchPlaceholder="Search options..."
        value={candidate}
        onValueChange={addValue}
      />
      {optionState?.status === "error" ? (
        <p className="text-xs text-[color:var(--color-danger-ink)]">{optionState.error}</p>
      ) : null}
      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <Badge
              key={option.value}
              tone="neutral"
              title={option.value}
              className="gap-1.5 whitespace-normal break-all text-left font-mono leading-4"
            >
              <span>{option.label}</span>
              <IconButton
                icon="x"
                label={`Remove ${option.label}`}
                size="sm"
                variant="ghost"
                onClick={() => removeValue(option.value)}
              />
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[color:var(--color-ink-subtle)]">No values selected.</p>
      )}
    </div>
  );
}

export function getActionFormFields(
  action: DeclarativeAction,
  translate?: TranslateFn
): readonly DeclarativeActionFormFieldDefinition[] {
  const schema = action.input?.schema;
  if (!isObject(schema) || !isObject(schema.properties)) {
    return [];
  }

  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  return Object.entries(schema.properties).map(([key, definition]) => {
    const typedDefinition = isObject(definition) ? definition : {};
    const type = typeof typedDefinition.type === "string" ? typedDefinition.type : "string";
    const labelKey =
      typeof typedDefinition.labelKey === "string" ? typedDefinition.labelKey : undefined;
    const fallbackLabel =
      typeof typedDefinition.title === "string" ? typedDefinition.title : humanizeKey(key);
    const title = labelKey
      ? (translate?.(labelKey, fallbackLabel) ?? fallbackLabel)
      : fallbackLabel;
    const enumOptions = Array.isArray(typedDefinition.enum)
      ? typedDefinition.enum
          .filter((value): value is string => typeof value === "string")
          .map((value) => ({ value, label: value }))
      : undefined;
    const itemEnumOptions =
      isObject(typedDefinition.items) && Array.isArray(typedDefinition.items.enum)
        ? typedDefinition.items.enum
            .filter((value): value is string => typeof value === "string")
            .map((value) => ({ value, label: value }))
        : undefined;
    const optionSource = parseOptionSource(typedDefinition["x-options"]);

    return {
      key,
      label: title,
      required: required.has(key),
      options: type === "array" ? itemEnumOptions : enumOptions,
      optionSource,
      kind:
        type === "number" || type === "integer"
          ? "number"
          : type === "boolean"
            ? "boolean"
            : type === "array"
              ? "stringArray"
              : type === "object"
                ? "json"
                : "text"
    };
  });
}

function parseOptionSource(value: unknown): DeclarativeActionOptionSource | undefined {
  if (!isObject(value) || !isObject(value.endpoint)) {
    return undefined;
  }
  const path = typeof value.endpoint.path === "string" ? value.endpoint.path : undefined;
  if (!path) {
    return undefined;
  }
  const method = typeof value.endpoint.method === "string" ? value.endpoint.method : "GET";
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return undefined;
  }

  return {
    endpoint: { method: method as AdminEndpointBinding["method"], path },
    valuePath: typeof value.valuePath === "string" ? value.valuePath : undefined,
    valueField: typeof value.valueField === "string" ? value.valueField : undefined,
    labelField: typeof value.labelField === "string" ? value.labelField : undefined,
    descriptionField:
      typeof value.descriptionField === "string" ? value.descriptionField : undefined,
    metaField: typeof value.metaField === "string" ? value.metaField : undefined,
    policy: isObject(value.policy)
      ? {
          allowedPathPrefixes: Array.isArray(value.policy.allowedPathPrefixes)
            ? value.policy.allowedPathPrefixes.filter(
                (prefix): prefix is string => typeof prefix === "string"
              )
            : undefined
        }
      : undefined
  };
}

export function createInitialDraftFields(
  action: DeclarativeAction,
  context?: DeclarativeActionContext
): Record<string, DraftFieldValue> {
  const fields = getActionFormFields(action);
  const sample = createSchemaSample(action.input?.schema);
  const sampleObject = isObject(sample) ? sample : {};

  return Object.fromEntries(
    fields.map((field) => {
      const recordValue = readObjectPath(context?.record, field.key);
      const fallbackValue = recordValue ?? sampleObject[field.key];
      return [field.key, serializeDraftFieldValue(field, fallbackValue)];
    })
  );
}

function serializeDraftFieldValue(
  field: DeclarativeActionFormFieldDefinition,
  value: unknown
): DraftFieldValue {
  if (field.kind === "boolean") {
    return Boolean(value);
  }
  if (field.kind === "stringArray") {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
    return [];
  }
  if (field.kind === "json") {
    return value === undefined ? "" : JSON.stringify(value, null, 2);
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export function defaultDraftFieldValue(
  field: DeclarativeActionFormFieldDefinition
): DraftFieldValue {
  if (field.kind === "boolean") {
    return false;
  }
  if (field.kind === "stringArray") {
    return [];
  }
  return "";
}

export function createActionBodyFromFields(
  action: DeclarativeAction,
  values: Record<string, DraftFieldValue>
): unknown {
  const fields = getActionFormFields(action);
  if (fields.length === 0) {
    return undefined;
  }

  const body: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.key] ?? defaultDraftFieldValue(field);
    const parsedValue = parseDraftFieldValue(field, value);
    if (parsedValue === undefined && !field.required) {
      continue;
    }
    body[field.key] = parsedValue;
  }

  return Object.keys(body).length > 0 ? body : undefined;
}

function parseDraftFieldValue(
  field: DeclarativeActionFormFieldDefinition,
  value: DraftFieldValue
): unknown {
  if (field.kind === "boolean") {
    return Boolean(value);
  }

  if (field.kind === "stringArray") {
    return Array.isArray(value) ? value : [];
  }

  const stringValue = typeof value === "string" ? value.trim() : "";
  if (!stringValue) {
    return undefined;
  }

  if (field.kind === "number") {
    const parsed = Number(stringValue);
    if (Number.isNaN(parsed)) {
      throw new Error(`${field.label} must be a number.`);
    }
    return parsed;
  }

  if (field.kind === "json") {
    try {
      return JSON.parse(stringValue);
    } catch {
      throw new Error(`${field.label} must be valid JSON.`);
    }
  }

  return stringValue;
}

export async function loadFieldOptions(
  field: DeclarativeActionFormFieldDefinition
): Promise<DeclarativeActionOptionState> {
  if (!field.optionSource) {
    return { status: "idle", options: field.options ?? [] };
  }

  const policyResult = validateAdminEndpointBinding(
    field.optionSource.endpoint,
    "data",
    field.optionSource.policy ?? { allowedPathPrefixes: ["/admin", "/v1"] }
  );
  if (!policyResult.ok) {
    return {
      status: "error",
      options: field.options ?? [],
      error: policyResult.reason ?? "Options endpoint rejected by admin security policy"
    };
  }

  try {
    const response = await cms.request({
      method: field.optionSource.endpoint.method ?? "GET",
      path: field.optionSource.endpoint.path
    });
    return {
      status: "success",
      options: extractActionOptions(response, field.optionSource)
    };
  } catch (error) {
    return {
      status: "error",
      options: field.options ?? [],
      error: toDisplayError(error)
    };
  }
}

function extractActionOptions(
  response: unknown,
  source: DeclarativeActionOptionSource
): readonly DeclarativeActionOption[] {
  const rawOptions = source.valuePath ? readObjectPath(response, source.valuePath) : response;
  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions.flatMap((item) => {
    const rawValue = source.valueField ? readObjectPath(item, source.valueField) : item;
    if (typeof rawValue !== "string" && typeof rawValue !== "number") {
      return [];
    }
    const value = String(rawValue);
    const rawLabel = source.labelField ? readObjectPath(item, source.labelField) : rawValue;
    const rawDescription = source.descriptionField
      ? readObjectPath(item, source.descriptionField)
      : undefined;
    const rawMeta = source.metaField ? readObjectPath(item, source.metaField) : undefined;

    return [
      {
        value,
        label:
          typeof rawLabel === "string" || typeof rawLabel === "number" ? String(rawLabel) : value,
        description:
          typeof rawDescription === "string" || typeof rawDescription === "number"
            ? String(rawDescription)
            : undefined,
        meta:
          typeof rawMeta === "string" || typeof rawMeta === "number" ? String(rawMeta) : undefined
      }
    ];
  });
}
