import { createCmsSdkClientCore } from "@trinacria-cms/sdk/runtime";
import { CatalogPage } from "catalog-plugin/admin";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

const cms = createCmsSdkClientCore({
  baseUrl: window.location.origin + "/catalog-cms",
  getAccessToken: () => (window as unknown as { fixtureCatalogToken: string }).fixtureCatalogToken
});
createRoot(document.getElementById("root")!).render(createElement(CatalogPage, { cms }));
