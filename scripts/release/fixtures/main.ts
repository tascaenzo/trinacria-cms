import { definePluginBackofficeModule, mountBackoffice } from "@trinacria-cms/admin-kernel";
import { EDITORIAL_PACK_ADMIN_RENDERERS } from "@trinacria-cms/editorial-pack/admin";
import { EDITORIAL_PACK_ADMIN_MANIFEST } from "@trinacria-cms/editorial-pack/admin-manifest";
import { EMAIL_PACK_ADMIN_RENDERERS } from "@trinacria-cms/email-pack/admin";
import { EMAIL_PACK_ADMIN_MANIFEST } from "@trinacria-cms/email-pack/admin-manifest";
import { MEDIA_PACK_ADMIN_RENDERERS } from "@trinacria-cms/media-pack/admin";
import { MEDIA_PACK_ADMIN_MANIFEST } from "@trinacria-cms/media-pack/admin-manifest";
import "@trinacria-cms/trinacria-ui/theme.css";
import { CATALOG_ADMIN_RENDERERS } from "catalog-plugin/admin";
import { CATALOG_ADMIN_MANIFEST } from "catalog-plugin/admin-manifest";

mountBackoffice(document.getElementById("root")!, {
  apiBaseUrl: "/cms",
  modules: [
    {
      ...definePluginBackofficeModule({
        pluginId: "catalog-plugin",
        displayName: "Catalog",
        admin: CATALOG_ADMIN_MANIFEST
      }),
      renderers: CATALOG_ADMIN_RENDERERS
    },
    {
      ...definePluginBackofficeModule({
        pluginId: "editorial-pack",
        displayName: "Editorial",
        admin: EDITORIAL_PACK_ADMIN_MANIFEST
      }),
      renderers: EDITORIAL_PACK_ADMIN_RENDERERS
    },
    {
      ...definePluginBackofficeModule({
        pluginId: "media-pack",
        displayName: "Media",
        admin: MEDIA_PACK_ADMIN_MANIFEST
      }),
      renderers: MEDIA_PACK_ADMIN_RENDERERS
    },
    {
      ...definePluginBackofficeModule({
        pluginId: "email-pack",
        displayName: "Email",
        admin: EMAIL_PACK_ADMIN_MANIFEST
      }),
      renderers: EMAIL_PACK_ADMIN_RENDERERS
    }
  ]
});
