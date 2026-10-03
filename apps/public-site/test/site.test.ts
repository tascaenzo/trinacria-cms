import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createPublicSiteServer, escapeJson, readSiteConfig } from "../src/server.js";
import { safeLink } from "../src/site.types.js";

test("SSR serialization and URL schemes cannot escape into executable content", () => {
  const json = escapeJson({ text: "</script><script>alert(1)</script>\u2028\u2029" });
  assert.ok(!json.includes("<")); assert.equal(JSON.parse(json).text, "</script><script>alert(1)</script>\u2028\u2029");
  for (const value of ["javascript:alert(1)", "data:text/html,test", "//evil.example", "/\\evil.example", "/\t/evil.example", "https://user:pass@example.com"]) assert.equal(safeLink(value), undefined);
  assert.equal(safeLink("/articles/page"), "/articles/page");
  assert.throws(() => readSiteConfig({ NODE_ENV: "production", PUBLIC_SITE_ORIGIN: "http://site.example" }));
  assert.throws(() => readSiteConfig({ PUBLIC_SITE_ORIGIN: "https://site.example/path" }));
});

test("SSR uses server-only SDK, controlled errors, canonical origin and preview POST/session boundaries", async () => {
  const directory = await mkdtemp(join(tmpdir(), "trinacria-site-test-"));
  let unavailable = false, consumed = false, revoked = false;
  const requests: { path: string; authorization?: string; cookie?: string }[] = [];
  const entry = { id: "entry", contentTypeKey: "article", title: "Public title", slug: "safe", data: { excerpt: "Safe summary" }, body: { version: 1, blocks: [
    { id: "text", type: "paragraph", version: 1, data: { text: "</script><script>window.xss=true</script>" } },
    { id: "link", type: "paragraph", version: 1, data: { text: "link", inline: [{ text: "Unsafe link", link: { href: "javascript:alert(1)" } }] } },
    { id: "image", type: "image", version: 1, data: { src: "https://evil.example/image", assetId: "asset", alt: "Image" } }
  ] } };
  const api = createServer(async (req, res) => {
    const path = new URL(req.url!, "http://fixture").pathname;
    requests.push({ path, authorization: req.headers.authorization, cookie: req.headers.cookie });
    res.setHeader("content-type", "application/json");
    if (unavailable) { res.statusCode = 503; return res.end('{"error":{"code":"service_unavailable","message":"Sensitive upstream detail"}}'); }
    if (path === "/v1/delivery/navigation") return res.end(JSON.stringify({ data: [{ label: "Home", href: "/" }] }));
    if (path.endsWith("/entries") && path.includes("/content-types/")) return res.end(JSON.stringify({ data: path.includes("/article/") ? [entry] : [] }));
    if (path === "/v1/delivery/content-types/article/entries/safe") return res.end(JSON.stringify({ data: entry }));
    if (req.method === "POST" && path === "/v1/preview/sessions") {
      let content = ""; for await (const chunk of req) content += chunk;
      const input = JSON.parse(content);
      if (consumed || input.origin !== "https://site.example" || req.headers.origin !== input.origin) { res.statusCode = 401; return res.end('{}'); }
      consumed = true; return res.end(JSON.stringify({ data: { sessionId: "s".repeat(43), entryId: "entry", expiresAt: new Date(Date.now() + 600000).toISOString() } }));
    }
    if (path === "/v1/preview/entries/entry" && req.headers.authorization === `Preview ${"s".repeat(43)}` && !revoked) return res.end(JSON.stringify({ data: { ...entry, title: "Working draft" } }));
    if (req.method === "DELETE" && path === "/v1/preview/sessions/current") { revoked = true; return res.end('{"data":{"revoked":true}}'); }
    res.statusCode = 404; res.end('{}');
  });
  await new Promise<void>(resolve => api.listen(0, "127.0.0.1", resolve));
  const apiPort = (api.address() as import("node:net").AddressInfo).port;
  let site: Awaited<ReturnType<typeof createPublicSiteServer>> | undefined;
  try {
    await mkdir(join(directory, ".vite")); await mkdir(join(directory, "assets"));
    await writeFile(join(directory, ".vite/manifest.json"), JSON.stringify({ "src/client.tsx": { isEntry: true, file: "assets/client.js" } }));
    await writeFile(join(directory, "assets/client.js"), "// fixture");
    site = await createPublicSiteServer({ origin: "https://site.example", apiBaseUrl: `http://127.0.0.1:${apiPort}`, siteId: "public-site", backofficeOrigins: ["https://admin.example"], secureCookies: true, clientDirectory: directory });
    await new Promise<void>(resolve => site!.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${(site.address() as import("node:net").AddressInfo).port}`;
    const response = await fetch(`${base}/articles/safe`, { headers: { host: "attacker.example", cookie: "cms_access_token=must-not-forward" } }), html = await response.text();
    assert.equal(response.status, 200); assert.ok(html.includes('href="https://site.example/articles/safe"'));
    assert.ok(!html.includes(`<script>window.xss`)); assert.ok(!html.includes('href="javascript:'));
    assert.ok(html.includes('src="/media/asset"')); assert.ok(!html.includes(`src="https://evil.example`));
    assert.ok(!html.includes("must-not-forward")); assert.ok(!html.includes(`127.0.0.1:${apiPort}`));
    assert.ok(response.headers.get("content-security-policy")!.includes("base-uri 'none'"));
    const form = new URLSearchParams({ token: "single-use-token-not-in-url", siteId: "public-site" });
    assert.equal((await fetch(`${base}/preview`, { method: "POST", body: form, headers: { origin: "https://attacker.example" }, redirect: "manual" })).status, 403);
    const exchange = await fetch(`${base}/preview`, { method: "POST", body: form, headers: { origin: "https://admin.example" }, redirect: "manual" });
    assert.equal(exchange.status, 303); assert.equal(exchange.headers.get("location"), "/preview/entries/entry");
    const setCookie = exchange.headers.get("set-cookie")!; for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age=600"]) assert.ok(setCookie.includes(flag));
    assert.equal((await fetch(`${base}/preview`, { method: "POST", body: form, headers: { origin: "https://admin.example" }, redirect: "manual" })).status, 401);
    const preview = await fetch(`${base}/preview/entries/entry`, { headers: { cookie: setCookie.split(";")[0]! } });
    assert.equal(preview.status, 200); assert.equal(preview.headers.get("cache-control"), "private, no-store"); assert.equal(preview.headers.get("x-robots-tag"), "noindex, nofollow");
    const previewHtml = await preview.text(); assert.ok(previewHtml.includes("Working draft")); assert.ok(!previewHtml.includes("s".repeat(43)));
    assert.equal((await fetch(`${base}/preview/exit`, { method: "POST", headers: { origin: "https://attacker.example", cookie: setCookie.split(";")[0]! }, redirect: "manual" })).status, 403);
    assert.equal((await fetch(`${base}/preview/exit`, { method: "POST", headers: { origin: "https://site.example", cookie: setCookie.split(";")[0]! }, redirect: "manual" })).status, 303); assert.equal(revoked, true);
    assert.ok((await (await fetch(`${base}/sitemap.xml`)).text()).includes("https://site.example/articles/safe"));
    assert.equal((await fetch(`${base}/assets/secret.js`)).status, 404);
    unavailable = true; assert.equal((await fetch(`${base}/health`)).status, 200); assert.equal((await fetch(`${base}/ready`)).status, 503);
    const failure = await fetch(`${base}/articles/safe`); assert.equal(failure.status, 503); assert.ok(!(await failure.text()).includes("Sensitive upstream"));
    assert.ok(requests.every(request => !request.cookie && !request.authorization?.startsWith("Bearer")));
  } finally {
    if (site) await new Promise<void>(resolve => site!.close(() => resolve()));
    await new Promise<void>(resolve => api.close(() => resolve())); await rm(directory, { recursive: true, force: true });
  }
});
