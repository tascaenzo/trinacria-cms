import assert from "node:assert/strict";
import test from "node:test";
import { configureBackofficeSdk } from "../src/runtime/cms-sdk.js";
import { loadRuntimeDiscovery } from "../src/runtime/runtime-discovery.js";

test("loadRuntimeDiscovery prefers runtime admin extension manifests", async () => {
  configureBackofficeSdk({
    sdk: {
      request: async ({ path }: { path: string }) => {
        assert.equal(path, "/v1/admin/extensions");
        return {
          data: [
            {
              pluginId: "blog-pack",
              displayName: "Blog Pack",
              admin: {
                routes: [
                  {
                    id: "posts",
                    path: "/blog/posts",
                    label: "Posts",
                    requiredPermission: "blog-pack:posts:read",
                    componentRef: "blog-pack.posts",
                    order: 30
                  }
                ],
                navigation: [{ id: "nav-posts", path: "/blog/posts", label: "Posts" }],
                widgets: [
                  {
                    id: "health-widget",
                    label: "Blog health",
                    componentRef: "blog-pack.health-widget",
                    requiredPermission: "blog-pack:settings:read"
                  }
                ],
                settingsSections: [
                  {
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
                ]
              }
            }
          ]
        };
      },
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
        listPluginContributions: async () => {
          throw new Error("contribution fallback should not be called");
        }
      }
    } as never
  });

  const discovery = await loadRuntimeDiscovery();

  assert.equal(discovery.plugins[0].pluginId, "blog-pack");
  assert.deepEqual(discovery.plugins[0].capabilities, ["blog.posts.read"]);
  assert.equal(discovery.manifests[0].pluginId, "blog-pack");
  assert.equal(discovery.manifests[0].displayName, "Blog Pack");
  assert.equal(discovery.manifests[0].admin?.pages?.[0].id, "posts");
  assert.equal(discovery.manifests[0].admin?.pages?.[0].componentRef, "blog-pack.posts");
  assert.equal(discovery.manifests[0].admin?.navigation?.[0].routeId, "posts");
  assert.equal(discovery.manifests[0].admin?.dashboard?.widgets?.[0].kind, "custom");
  assert.equal(
    discovery.manifests[0].admin?.settings?.sections?.[0].componentRef,
    "blog-pack.seo-settings"
  );
});

test("loadRuntimeDiscovery falls back to backend plugin contributions", async () => {
  configureBackofficeSdk({
    sdk: {
      request: async () => {
        throw new Error("admin extensions unavailable");
      },
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
              widgets: [
                {
                  pluginId: "blog-pack",
                  key: "health-widget",
                  declaration: {
                    id: "health-widget",
                    label: "Blog health",
                    componentRef: "blog-pack.health-widget",
                    requiredPermission: "blog-pack:settings:read"
                  }
                }
              ],
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
  assert.equal(discovery.manifests[0].admin?.dashboard?.widgets?.[0].kind, "custom");
  assert.equal(
    discovery.manifests[0].admin?.dashboard?.widgets?.[0].componentRef,
    "blog-pack.health-widget"
  );
  assert.deepEqual(discovery.manifests[0].admin?.dashboard?.widgets?.[0].guards, [
    { pluginId: "blog-pack", permissionKey: "blog-pack:settings:read" }
  ]);
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
