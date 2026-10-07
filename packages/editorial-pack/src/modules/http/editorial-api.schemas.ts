import { jsonValue } from "@trinacria-cms/core-pack/runtime";
import { type RouteOpenApiDocs, s, toOpenApiSchema } from "@trinacria-cms/kernel";
import { ContentTypeRecordSchema } from "../content-types/content-types.schemas.js";
import { EntryRecordSchema } from "../entries/entries.schemas.js";
import { EntryRevisionRecordSchema } from "../revisions/revisions.schemas.js";

const MetaSchema = s.object(
  { pluginId: s.string(), count: s.number({ int: true, min: 0 }).optional() },
  { strict: false }
);
const envelope = <T extends Parameters<typeof toOpenApiSchema>[0]>(schema: T, list = false) => {
  const data = toOpenApiSchema(schema);
  return {
    type: "object",
    required: ["data"],
    properties: {
      data: list ? { type: "array", items: data } : data,
      meta: toOpenApiSchema(MetaSchema)
    }
  };
};
const ErrorSchema = s.object(
  {
    error: s.object(
      {
        code: s.string(),
        message: s.string(),
        details: s.record(s.string(), jsonValue()).optional()
      },
      { strict: false }
    ),
    meta: MetaSchema.optional()
  },
  { strict: false }
);
export const EditorialResponses = {
  contentType: envelope(ContentTypeRecordSchema),
  contentTypes: envelope(ContentTypeRecordSchema, true),
  entry: envelope(EntryRecordSchema),
  entries: envelope(EntryRecordSchema, true),
  revisions: envelope(EntryRevisionRecordSchema, true),
  deleted: envelope(s.object({ deleted: s.boolean() })),
  permanent: envelope(s.object({ id: s.string(), permanentlyDeleted: s.boolean() }))
};
export const EditorialPaginationParameters = [
  { name: "limit", in: "query" as const, schema: { type: "integer", minimum: 1, maximum: 100 } },
  { name: "offset", in: "query" as const, schema: { type: "integer", minimum: 0 } }
];
export function editorialRouteDocs(
  operationId: string,
  schema: Record<string, unknown>,
  input?: Parameters<typeof toOpenApiSchema>[0],
  parameters: NonNullable<RouteOpenApiDocs["parameters"]> = []
): RouteOpenApiDocs {
  return {
    operationId,
    summary: operationId,
    tags: ["Editorial"],
    pluginId: "editorial-pack",
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    parameters,
    description:
      "Application authorization and model validation apply. Cookie mutations require a trusted CSRF origin. meta.count is the number of returned items.",
    ...(input ? { requestBody: { required: true, schema: toOpenApiSchema(input) } } : {}),
    responses: {
      200: { description: "Success", schema },
      ...Object.fromEntries(
        [400, 401, 403, 404, 409].map((status) => [
          status,
          {
            description: (
              {
                400: "Invalid input",
                401: "Authentication required",
                403: "Permission denied",
                404: "Resource unavailable",
                409: "Version or model conflict"
              } as Record<number, string>
            )[status],
            schema: toOpenApiSchema(ErrorSchema)
          }
        ])
      )
    }
  };
}
