import { createToken } from "@trinacria-cms/kernel";
import type { ApplicationOperations, OperationAuthorizer } from "@trinacria-cms/kernel/contracts";
import { operationSubjectId } from "@trinacria-cms/kernel/runtime";
import type { ContentTypesService } from "../modules/content-types/services/content-types.service.js";
export type ContentTypeOperations = ApplicationOperations<
  Pick<
    ContentTypesService,
    | "getContentType"
    | "listContentTypes"
    | "updateContentType"
    | "deleteContentType"
    | "restoreContentType"
    | "permanentlyDeleteContentType"
  >
> & {
  createContentType(
    context: import("@trinacria-cms/kernel/contracts").OperationContext,
    input: Parameters<ContentTypesService["createContentType"]>[0]
  ): ReturnType<ContentTypesService["createContentType"]>;
};
export const CONTENT_TYPE_OPERATIONS =
  createToken<ContentTypeOperations>("CONTENT_TYPE_OPERATIONS");
export function createContentTypeOperations(
  service: ContentTypesService,
  authorizer: OperationAuthorizer
): ContentTypeOperations {
  const bound = (context: import("@trinacria-cms/kernel/contracts").OperationContext) =>
    service.withAuthorization(context, authorizer);
  return Object.freeze({
    createContentType: (context, input) =>
      bound(context).createContentType(structuredClone(input), operationSubjectId(context)),
    getContentType: (context, id) => bound(context).getContentType(id),
    listContentTypes: (context, options) =>
      bound(context).listContentTypes(structuredClone(options)),
    updateContentType: (context, id, input) =>
      bound(context).updateContentType(id, structuredClone(input)),
    deleteContentType: (context, id) => bound(context).deleteContentType(id),
    restoreContentType: (context, id) => bound(context).restoreContentType(id),
    permanentlyDeleteContentType: (context, id) => bound(context).permanentlyDeleteContentType(id)
  } satisfies ContentTypeOperations);
}
