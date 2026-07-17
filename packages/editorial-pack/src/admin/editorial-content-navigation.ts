import type { CmsClient, EditorialContentType } from "./editorial-admin.types.js";

/** Builds sidebar items from the models that the administrator explicitly exposes. */
export async function loadEditorialContentNavigation(cms: CmsClient) {
  const response = await cms.request<{ data: readonly EditorialContentType[] }>({
    method: "GET",
    path: "/v1/editorial/content-types",
    query: { status: "active", limit: 100, offset: 0 }
  });
  return response.data
    .filter((contentType) => contentType.showInMainNavigation)
    .sort((left, right) => left.name.localeCompare(right.name, "it"))
    .map((contentType, index) => ({
      id: `nav-editorial-content-type-${contentType.id}`,
      routeId: "editorial-entries",
      title: contentType.name,
      icon: "file-text",
      group: "Editoriale",
      order: 70 + index,
      params: { modelId: contentType.id }
    }));
}
