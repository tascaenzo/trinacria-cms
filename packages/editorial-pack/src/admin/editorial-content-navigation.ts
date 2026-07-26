import type { CmsClient, EditorialContentType } from "./editorial-admin.types.js";

/** Every active content model is an editorial destination; hiding it would strand its entries. */
export async function loadEditorialContentNavigation(cms: CmsClient) {
  const response = await cms.request<{ data: readonly EditorialContentType[] }>({
    method: "GET",
    path: "/v1/editorial/content-types",
    query: { status: "active", limit: 100, offset: 0 }
  });
  return [...response.data]
    .sort((left, right) => left.name.localeCompare(right.name, "it"))
    .map((contentType, index) => ({
      id: `nav-editorial-content-type-${contentType.id}`,
      routeId: "editorial-entries",
      title: contentType.name,
      icon: contentType.icon ?? "file-text",
      group: "Editoriale",
      order: 71 + index,
      params: { modelId: contentType.id }
    }));
}
