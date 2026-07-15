import {
  createPluginApiResponder,
  HttpController,
  s,
  toOpenApiSchema,
  type HttpContext
} from "@trinacria-cms/kernel";
import { CORE_PACK_PLUGIN_ID } from "../../plugin/core-pack.constants.js";
import { CORE_PACK_OPENAPI_TAGS } from "../openapi-tags.js";
import { I18nBundlesService } from "./i18n-bundles.service.js";

const responder = createPluginApiResponder(CORE_PACK_PLUGIN_ID);
const LocaleSchema = s
  .string({ trim: true, minLength: 2, maxLength: 35 })
  .refine((value) => /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(value), "Invalid locale");
const I18nBundleResponseSchema = s.object(
  {
    data: s.object(
      {
        locale: LocaleSchema,
        fallbackLocale: s.literal("en"),
        namespace: s.string({ minLength: 3 }).optional(),
        messages: s.record(s.string({ minLength: 1 }), s.string({ minLength: 1 }))
      },
      { strict: true }
    )
  },
  { strict: true }
);

/** Public, cacheable translation dictionary endpoint for modular clients. */
export class I18nController extends HttpController {
  constructor(private readonly bundles: I18nBundlesService) {
    super();
  }

  routes() {
    return this.router().get("/v1/i18n/:locale", this.getLocale, {
      docs: {
        summary: "Resolve installed plugin translations for a locale",
        tags: [CORE_PACK_OPENAPI_TAGS.I18N],
        operationId: "getI18nBundle",
        parameters: [
          { name: "locale", in: "path", required: true, schema: { type: "string" } },
          { name: "namespace", in: "query", required: false, schema: { type: "string" } },
          { name: "surface", in: "query", required: false, schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Merged translation dictionary", schema: toOpenApiSchema(I18nBundleResponseSchema) }
        }
      }
    }).build();
  }

  private getLocale = async (ctx: HttpContext) => {
    try {
      const locale = LocaleSchema.parse(ctx.params.locale);
      const namespace =
        (typeof ctx.query.namespace === "string" ? ctx.query.namespace.trim() : "") || undefined;
      const surface =
        (typeof ctx.query.surface === "string" ? ctx.query.surface.trim() : "") || undefined;
      return responder.success(await this.bundles.resolveLocale(locale, namespace, surface));
    } catch (error) {
      return responder.fromError(error);
    }
  };
}
