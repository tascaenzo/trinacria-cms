import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttpsServer, type ServerOptions } from "node:https";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CmsSdkHttpError, createCmsSdkClient, type FetchLike } from "@trinacria-cms/sdk";
import { renderToString } from "react-dom/server";
import { Site } from "./site.js";
import { entryPath, type SiteEntry, type SiteProps } from "./site.types.js";

export interface SiteConfig {
  origin: string;
  apiBaseUrl: string;
  siteId: string;
  backofficeOrigins: string[];
  secureCookies: boolean;
  clientDirectory: string;
}
export function readSiteConfig(env: NodeJS.ProcessEnv = process.env): SiteConfig {
  const origin = env.PUBLIC_SITE_ORIGIN ?? "http://localhost:4180",
    apiBaseUrl = env.PUBLIC_SITE_API_BASE_URL ?? "http://127.0.0.1:3000";
  const canonical = new URL(origin),
    api = new URL(apiBaseUrl);
  if (
    canonical.origin !== origin ||
    !["http:", "https:"].includes(canonical.protocol) ||
    canonical.username ||
    canonical.password ||
    (env.NODE_ENV === "production" && canonical.protocol !== "https:")
  )
    throw new Error("Configure an exact HTTPS canonical site origin");
  if (!["http:", "https:"].includes(api.protocol) || api.username || api.password)
    throw new Error("Invalid server-only CMS API base URL");
  const backofficeOrigins: unknown = JSON.parse(env.PUBLIC_SITE_BACKOFFICE_ORIGINS_JSON ?? "[]");
  if (
    !Array.isArray(backofficeOrigins) ||
    backofficeOrigins.some(
      (value) =>
        typeof value !== "string" ||
        new URL(value).origin !== value ||
        (env.NODE_ENV === "production" && new URL(value).protocol !== "https:")
    )
  )
    throw new Error("Backoffice origins must be exact trusted origins");
  const siteId = env.PUBLIC_SITE_ID ?? "public-site";
  if (!/^[a-z][a-z0-9-]{0,79}$/.test(siteId)) throw new Error("Invalid preview site ID");
  return {
    origin,
    apiBaseUrl,
    siteId,
    backofficeOrigins: backofficeOrigins as string[],
    secureCookies: canonical.protocol === "https:",
    clientDirectory: resolve(env.PUBLIC_SITE_CLIENT_DIRECTORY ?? "dist/client")
  };
}
export function escapeJson(value: unknown) {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!
  );
const cookieName = (config: SiteConfig) =>
  config.secureCookies ? "__Host-trinacria-preview" : "trinacria-preview-dev";
const cookie = (config: SiteConfig, sessionId: string, age: number) =>
  `${cookieName(config)}=${sessionId}; Path=/; HttpOnly; ${config.secureCookies ? "Secure; " : ""}SameSite=Lax; Max-Age=${age}`;
function sessionFrom(req: IncomingMessage, config: SiteConfig) {
  const part = req.headers.cookie
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${cookieName(config)}=`));
  const session = part?.slice(cookieName(config).length + 1);
  return session && /^[a-zA-Z0-9_-]{43}$/.test(session) ? session : undefined;
}
async function body(req: IncomingMessage, max = 8192) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new Error("Body too large");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
async function boundedBytes(response: Response, max: number) {
  if (Number(response.headers.get("content-length")) > max) {
    await response.body?.cancel();
    throw new Error("CMS response too large");
  }
  const reader = response.body?.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        size += item.value.length;
        if (size > max) throw new Error("CMS response too large");
        chunks.push(item.value);
      }
    } finally {
      await reader.cancel();
    }
  }
  return Buffer.concat(chunks);
}
function fetchCms(onHeaders?: (headers: Headers) => void): FetchLike {
  return async (input, init) => {
    const response = await fetch(input, {
      ...init,
      body: init?.body as BodyInit | undefined,
      signal: init?.signal as AbortSignal | undefined,
      redirect: "error"
    });
    onHeaders?.(response.headers);
    return {
      status: response.status,
      headers: response.headers,
      text: async () => (await boundedBytes(response, 1024 * 1024)).toString("utf8"),
      arrayBuffer: async () => {
        const bytes = await boundedBytes(response, 16 * 1024 * 1024);
        return bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer;
      }
    };
  };
}
export async function createPublicSiteServer(config: SiteConfig, tls?: ServerOptions) {
  const manifest = JSON.parse(
    await readFile(resolve(config.clientDirectory, ".vite/manifest.json"), "utf8")
  ) as Record<string, { file: string; css?: string[]; isEntry?: boolean }>;
  const client = Object.values(manifest).find((entry) => entry.isEntry);
  if (!client) throw new Error("Public site client build is missing");
  const assets = new Set(
    Object.values(manifest).flatMap((entry) => [entry.file, ...(entry.css ?? [])])
  );
  const cms = createCmsSdkClient({
    baseUrl: config.apiBaseUrl,
    fetch: fetchCms(),
    requestTimeoutMs: 5000,
    credentials: "omit"
  });
  const previewHeaders = (session: string) => ({
    authorization: `Preview ${session}`,
    "x-preview-site": config.siteId,
    origin: config.origin
  });
  const send = (
    res: ServerResponse,
    status: number,
    content: string | Uint8Array,
    type: string
  ) => {
    res.writeHead(status, {
      "content-type": type,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin"
    });
    res.end(content);
  };
  async function list(key: string, offset = 0) {
    try {
      return (
        await cms.delivery.listPublishedEntries({ path: { key }, query: { limit: 50, offset } })
      ).data as unknown as SiteEntry[];
    } catch (error) {
      if (error instanceof CmsSdkHttpError && error.status === 404) return [];
      throw error;
    }
  }
  async function html(res: ServerResponse, props: SiteProps, status = 200) {
    const nonce = randomBytes(18).toString("base64");
    res.setHeader(
      "content-security-policy",
      `default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`
    );
    res.setHeader(
      "x-robots-tag",
      props.preview || status !== 200 ? "noindex, nofollow" : "index, follow"
    );
    const content = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(props.title)}</title><meta name="description" content="${escapeHtml(props.description)}"><link rel="canonical" href="${escapeHtml(props.canonical)}"><meta property="og:title" content="${escapeHtml(props.title)}"><meta property="og:description" content="${escapeHtml(props.description)}"><meta property="og:url" content="${escapeHtml(props.canonical)}">${(client!.css ?? []).map((file) => `<link rel="stylesheet" href="/${escapeHtml(file)}">`).join("")}</head><body><div id="root">${renderToString(<Site {...props} />)}</div><script nonce="${nonce}" id="site-data" type="application/json">${escapeJson(props)}</script><script nonce="${nonce}" type="module" src="/${escapeHtml(client!.file)}"></script></body></html>`;
    send(res, status, content, "text/html; charset=utf-8");
  }
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    let path = "/";
    try {
      const url = new URL(req.url ?? "/", config.origin);
      path = url.pathname;
      if (req.method === "GET" && path === "/health")
        return send(res, 200, '{"status":"ok"}', "application/json");
      if (req.method === "GET" && path === "/ready") {
        await cms.delivery.getPublicNavigation();
        return send(res, 200, '{"status":"ready"}', "application/json");
      }
      if (req.method === "GET" && path.startsWith("/assets/")) {
        const file = path.slice(1);
        if (!assets.has(file)) return send(res, 404, "Not found", "text/plain");
        return send(
          res,
          200,
          await readFile(resolve(config.clientDirectory, file)),
          file.endsWith(".css") ? "text/css" : "text/javascript"
        );
      }
      if (req.method === "POST" && path === "/preview") {
        if (
          !req.headers.origin ||
          !config.backofficeOrigins.includes(req.headers.origin) ||
          req.headers["content-type"]?.split(";")[0] !== "application/x-www-form-urlencoded"
        )
          return send(res, 403, "Preview request rejected", "text/plain");
        const input = new URLSearchParams(await body(req));
        if (
          [...input.keys()].some((key) => !["token", "siteId"].includes(key)) ||
          input.getAll("token").length !== 1 ||
          input.getAll("siteId").length !== 1 ||
          input.get("siteId") !== config.siteId
        )
          return send(res, 400, "Preview request rejected", "text/plain");
        const response = await cms.preview.createPreviewSession(
          { body: { token: input.get("token")!, siteId: config.siteId, origin: config.origin } },
          { headers: { origin: config.origin } }
        );
        res.setHeader("set-cookie", cookie(config, response.data.sessionId, 600));
        res.setHeader("location", `/preview/entries/${encodeURIComponent(response.data.entryId)}`);
        return send(res, 303, "", "text/plain");
      }
      if (req.method === "POST" && path === "/preview/exit") {
        if (req.headers.origin !== config.origin)
          return send(res, 403, "Preview request rejected", "text/plain");
        const session = sessionFrom(req, config);
        res.setHeader("set-cookie", cookie(config, "", 0));
        if (session)
          await cms.preview
            .revokePreviewSession({ headers: previewHeaders(session) })
            .catch(() => undefined);
        res.setHeader("location", "/");
        return send(res, 303, "", "text/plain");
      }
      if (req.method !== "GET") return send(res, 405, "Method not allowed", "text/plain");
      if (path.startsWith("/media/")) {
        const id = decodeURIComponent(path.slice(7));
        if (!id || id.includes("/") || id.length > 240)
          return send(res, 404, "Not found", "text/plain");
        let mediaType = "application/octet-stream";
        const mediaCms = createCmsSdkClient({
          baseUrl: config.apiBaseUrl,
          fetch: fetchCms((headers) => {
            mediaType = headers.get("content-type") ?? mediaType;
          }),
          requestTimeoutMs: 5000,
          credentials: "omit"
        });
        const bytes = await mediaCms.delivery.getPublicMediaContent({ path: { id } });
        const inline = [
          "image/png",
          "image/jpeg",
          "image/webp",
          "image/avif",
          "image/gif"
        ].includes(mediaType);
        res.setHeader("content-disposition", inline ? "inline" : "attachment");
        res.setHeader("content-security-policy", "default-src 'none'; sandbox");
        return send(res, 200, bytes, inline ? mediaType : "application/octet-stream");
      }
      if (path === "/robots.txt")
        return send(
          res,
          200,
          `User-agent: *\nDisallow: /preview\nSitemap: ${config.origin}/sitemap.xml\n`,
          "text/plain"
        );
      if (path === "/sitemap.xml") {
        const locations: string[] = [config.origin, `${config.origin}/articles`];
        for (const key of ["article", "page"])
          for (let offset = 0; offset <= 10000; offset += 50) {
            const entries = await list(key, offset);
            for (const entry of entries)
              if (entry.slug) locations.push(config.origin + entryPath(entry));
            if (entries.length < 50) break;
          }
        return send(
          res,
          200,
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations.map((location) => `<url><loc>${escapeHtml(location)}</loc></url>`).join("")}</urlset>`,
          "application/xml"
        );
      }
      const props: SiteProps = {
        title: path === "/" ? "Storie e idee" : "Articoli",
        description: "Il giornale di Trinacria",
        canonical: config.origin + path,
        preview: false,
        navigation: []
      };
      if (path.startsWith("/preview/entries/")) {
        const session = sessionFrom(req, config);
        if (!session)
          return html(
            res,
            {
              ...props,
              preview: true,
              title: "Anteprima scaduta",
              error: "Apri una nuova anteprima dal backoffice."
            },
            401
          );
        const id = decodeURIComponent(path.slice(17)),
          result = await cms.preview.getPreviewEntry(
            { path: { id } },
            { headers: previewHeaders(session) }
          );
        props.entry = result.data as unknown as SiteEntry;
        props.preview = true;
      } else {
        props.navigation = (await cms.delivery.getPublicNavigation()).data;
        if (path === "/" || path === "/articles") {
          const offset = Number(url.searchParams.get("offset") ?? "0");
          if (
            !Number.isInteger(offset) ||
            offset < 0 ||
            offset > 10000 ||
            [...url.searchParams.keys()].some((key) => key !== "offset")
          )
            return send(res, 400, "Invalid pagination", "text/plain");
          props.entries = await list("article", offset);
          if (props.entries.length === 50 && offset < 10000)
            props.next = `/articles?offset=${offset + 50}`;
        } else {
          const match = /^\/(articles|pages)\/([^/]+)$/.exec(path),
            generic = /^\/content\/([a-z][a-z0-9-]{1,79})\/([^/]+)$/.exec(path);
          if (!match && !generic)
            return html(
              res,
              { ...props, title: "Pagina non trovata", error: "Il contenuto non è disponibile." },
              404
            );
          const key = match ? (match[1] === "articles" ? "article" : "page") : generic![1]!,
            slug = decodeURIComponent((match ?? generic)![2]!);
          props.entry = (await cms.delivery.getPublishedEntry({ path: { key, slug } }))
            .data as unknown as SiteEntry;
        }
      }
      if (props.entry) {
        props.title = props.entry.title ?? "Contenuto";
        props.description =
          typeof props.entry.data.excerpt === "string"
            ? props.entry.data.excerpt.slice(0, 300)
            : props.description;
      }
      return html(res, props);
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const status =
        error instanceof CmsSdkHttpError && [400, 401, 403, 404, 429].includes(error.status)
          ? error.status
          : 503;
      if (path.startsWith("/media/") || ["/preview", "/ready"].includes(path))
        return send(res, status, "Resource unavailable", "text/plain");
      return html(
        res,
        {
          title: status === 404 ? "Pagina non trovata" : "Contenuto non disponibile",
          description: "Trinacria Journal",
          canonical: config.origin + path,
          navigation: [],
          preview: path.startsWith("/preview/"),
          error: "Il contenuto non è disponibile. Riprova tra poco."
        },
        status
      );
    }
  };
  return tls ? createHttpsServer(tls, handler) : createServer(handler);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const certFile = process.env.PUBLIC_SITE_TLS_CERT_FILE,
    keyFile = process.env.PUBLIC_SITE_TLS_KEY_FILE;
  if (!!certFile !== !!keyFile) throw new Error("Configure both TLS certificate and key files");
  const tls =
    certFile && keyFile
      ? { cert: await readFile(certFile), key: await readFile(keyFile) }
      : undefined;
  const server = await createPublicSiteServer(readSiteConfig(), tls);
  server.listen(
    Number(process.env.PUBLIC_SITE_PORT ?? "4180"),
    process.env.PUBLIC_SITE_HOST ?? "127.0.0.1"
  );
  const close = () => server.close();
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
