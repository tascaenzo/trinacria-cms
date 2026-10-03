import assert from "node:assert/strict";
import test from "node:test";
import { TrinacriaApp, valueProvider } from "@trinacria/core";
import { buildOpenApiDocument, type OpenApiRouteEntry } from "@trinacria/http";
import { createOpenApiHooks, validateOpenApiRoutes } from "../src/runtime/cms-starter/openapi.js";
import { CORE_TOKENS } from "../src/tokens/core-tokens.js";

test("bootstrap route inventory retains queries/owners and alternative cookie or complete signed-plugin auth", async () => {
  const app = new TrinacriaApp();
  app.registerGlobalProvider(valueProvider(CORE_TOKENS.HTTP_ACCESS_COOKIE_NAME, async () => "host_custom_access"));
  await app.start();
  const hooks = createOpenApiHooks({ enabled: true, title: "Fixture", version: "1.0.0" }, app);
  const entries: OpenApiRouteEntry[] = [{ controllerName: "Fixture", route: { method: "GET", path: "/fixture/:id", handler: () => ({}), docs: { pluginId: "fixture", operationId: "getFixture", tags: ["Fixture"], security: [{ bearerAuth: [] }, { pluginCallerAuth: [] }], parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }], responses: {200: {description: "OK", schema: {type:"object"}}} } } }];
  const doc = hooks.config!.transformDocument(buildOpenApiDocument({ title: "Fixture", version: "1.0.0", routes: entries }));
  hooks.config!.onDocumentGenerated(doc); hooks.onRoutesRebuilt(entries);
  const operation = doc.paths["/fixture/{id}"].get as {parameters: {name: string}[]; security: Record<string,unknown>[]; "x-cms-plugin-id": string};
  assert.equal(operation["x-cms-plugin-id"], "fixture");
  assert.ok(operation.parameters.some(p => p.name === "limit"));
  assert.ok(operation.security.some(r => "cookieAuth" in r));
  assert.ok(operation.security.some(r => ["pluginCallerAuth", "pluginCallerId", "pluginCallerTimestamp", "pluginCallerNonce"].every(k => k in r)));
  await hooks.config!.jsonMiddlewares[0]({}, async () => null);
  assert.equal((doc.components!.securitySchemes as Record<string,{name?:string}>).cookieAuth.name,"host_custom_access");
  await app.shutdown();
});

test("OpenAPI fails closed for missing routes, normalized ID collisions and exclusions without reasons", () => {
  const doc = { openapi: "3.0.3", info: {title:"Fixture",version:"1"}, paths: {} };
  assert.throws(() => validateOpenApiRoutes(doc, [{ method:"GET", path:"/missing", controllerName:"Fixture", publicApi:true, pluginId:"fixture", operationId:"missing" }]), /missing from OpenAPI/);
  assert.throws(() => validateOpenApiRoutes(doc, [{ method:"GET", path:"/internal", controllerName:"Fixture", publicApi:false }]), /needs a reason/);
  const collision = { ...doc, paths: { "/a": { get: { operationId:"get-item", tags:["Fixture"], responses:{200:{description:"OK"}} } }, "/b": { get: { operationId:"getItem", tags:["Fixture"], responses:{200:{description:"OK"}} } } } };
  assert.throws(() => validateOpenApiRoutes(collision, ["a","b"].map(path => ({method:"GET",path:`/${path}`,controllerName:"Fixture",publicApi:true,pluginId:"fixture",operationId:path}))), /Duplicate/);
});
