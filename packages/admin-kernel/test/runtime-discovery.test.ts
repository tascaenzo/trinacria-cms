import assert from "node:assert/strict";
import test from "node:test";
import { configureBackofficeSdk } from "../src/runtime/cms-sdk.js";
import { loadRuntimeDiscovery } from "../src/runtime/runtime-discovery.js";

test("loadRuntimeDiscovery maps backend plugin contributions to admin manifests", async () => {
  configureBackofficeSdk({
    sdk: {
      system: {
        listInstalledPlugins: async () => ({
          data: [{ id: "blog-pack", version: "1.0.0", state: "loaded" }]
        }),
        listInstalledCapabilities: async () => ({
          data: [
            {
              pluginId: "blog-pack",
              capability: "blog.posts.read"
            }
          ]
        }),
        listPluginContributions: async () => ({
          data: {
            entities: [],
            settings: [],
            events: { emits: [], subscribes: [] },
            admin: {
              routes: [
                {
                  pluginId: "blog-pack",
                  key: "posts",
                  declaration: {
                    id: "posts",
                    path: "/blog/posts",
                    label: "Posts",
                    requiredPermission: "blog-pack:posts:read",
                    componentRef: "blog-pack.posts",
                    order: 30
                  }
                }
              ],
              navigation: [
                {
                  pluginId: "blog-pack",
                  key: "nav-posts",
                  declaration: {
                    id: "nav-posts",
                    path: "/blog/posts",
                    label: "Posts"
                  }
                }
              ],
              resources: [],
              widgets: [],
              settingsSections: [
                {
                  pluginId: "blog-pack",
                  key: "seo-settings",
                  declaration: {
                    id: "seo-settings",
                    label: "SEO",
                    summary: "SEO controls",
                    kind: "custom",
                    componentRef: "blog-pack.seo-settings",
                    namespace: "seo",
                    settingKeys: ["blog-pack:seo:title"],
                    order: 40,
                    requiredPermission: "blog-pack:settings:read"
                  }
                }
              ]
            }
          }
        })
      }
    } as never
  });

  const discovery = await loadRuntimeDiscovery();

  assert.equal(discovery.plugins[0].pluginId, "blog-pack");
  assert.deepEqual(discovery.plugins[0].capabilities, ["blog.posts.read"]);
  assert.equal(discovery.manifests[0].pluginId, "blog-pack");
  assert.equal(discovery.manifests[0].admin?.pages?.[0].id, "posts");
  assert.equal(discovery.manifests[0].admin?.pages?.[0].componentRef, "blog-pack.posts");
  assert.equal(discovery.manifests[0].admin?.pages?.[0].order, 30);
  assert.equal(discovery.manifests[0].admin?.navigation?.[0].routeId, "posts");
  assert.deepEqual(discovery.manifests[0].admin?.pages?.[0].guards, [
    { pluginId: "blog-pack", permissionKey: "blog-pack:posts:read" }
  ]);
  assert.equal(discovery.manifests[0].admin?.settings?.sections?.[0].kind, "custom");
  assert.equal(
    discovery.manifests[0].admin?.settings?.sections?.[0].componentRef,
    "blog-pack.seo-settings"
  );
  assert.equal(discovery.manifests[0].admin?.settings?.sections?.[0].summary, "SEO controls");
  assert.equal(discovery.manifests[0].admin?.settings?.sections?.[0].category, "seo");
  assert.deepEqual(discovery.manifests[0].admin?.settings?.sections?.[0].settingKeys, [
    "blog-pack:seo:title"
  ]);
  assert.equal(discovery.manifests[0].admin?.settings?.sections?.[0].order, 40);
  assert.deepEqual(discovery.manifests[0].admin?.settings?.sections?.[0].guards, [
    { pluginId: "blog-pack", permissionKey: "blog-pack:settings:read" }
  ]);
});
