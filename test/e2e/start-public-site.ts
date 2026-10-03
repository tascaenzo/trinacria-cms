import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const { createPublicSiteServer, readSiteConfig } = await import(new URL("../../apps/public-site/dist/server/server.js", import.meta.url).href);
const directory = await mkdtemp(join(tmpdir(), "trinacria-site-tls-e2e-"));
try {
  const key = join(directory, "key.pem"), cert = join(directory, "cert.pem");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=localhost"], { stdio: "ignore" });
  const config = readSiteConfig({ ...process.env, NODE_ENV: "test", PUBLIC_SITE_CLIENT_DIRECTORY: resolve("apps/public-site/dist/client") });
  const server = await createPublicSiteServer(config, { key: await readFile(key), cert: await readFile(cert) });
  server.listen(4180, "localhost");
  const close = () => server.close(() => { void rm(directory, { recursive: true, force: true }); });
  process.once("SIGINT", close); process.once("SIGTERM", close);
} catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
