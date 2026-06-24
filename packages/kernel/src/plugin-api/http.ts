export interface SuccessEnvelope<TData, TMeta = Record<string, unknown>> {
  data: TData;
  meta?: TMeta;
}

export interface ErrorEnvelope<TDetails = Record<string, unknown>> {
  error: {
    code: string;
    message: string;
    details?: TDetails;
  };
}

export function successEnvelope<TData, TMeta = Record<string, unknown>>(
  data: TData,
  meta?: TMeta
): SuccessEnvelope<TData, TMeta> {
  return meta === undefined ? { data } : { data, meta };
}

export function errorEnvelope<TDetails = Record<string, unknown>>(
  code: string,
  message: string,
  details?: TDetails
): ErrorEnvelope<TDetails> {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    }
  };
}

export interface SchemaParser<TValue> {
  parse(value: unknown): TValue;
}

export function parseWithSchema<TValue>(schema: SchemaParser<TValue>, value: unknown): TValue {
  return schema.parse(value);
}
