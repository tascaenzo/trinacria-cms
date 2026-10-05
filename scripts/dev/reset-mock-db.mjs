/** biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Developer utility runs directly in Node, outside cached Turbo tasks. */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { createCmsSdkClient } from "@trinacria-cms/sdk";
import mongoose from "mongoose";
import { createPlaygroundCmsApp } from "../../apps/playground/dist/playground-app.js";
import { loadPlaygroundEnv } from "../../apps/playground/dist/playground-env.js";

// This is an explicitly destructive developer utility, never a startup hook.
const envFile = loadPlaygroundEnv();
const uri = new URL(process.env.MONGO_URI ?? "");
assert.equal(process.env.NODE_ENV === "production", false, "Development only");
assert.equal(uri.protocol, "mongodb:");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname), "Local Mongo only");
assert.equal(uri.pathname, "/trinacria_cms", "Only the development CMS database is supported");
assert.ok(
  process.argv.slice(2).every((arg) => arg === "--reset"),
  "Unknown argument"
);

const client = await new mongoose.mongo.MongoClient(uri.toString()).connect();
const database = client.db("trinacria_cms");
let app;
try {
  const { databases } = await database.admin().listDatabases();
  const oldDatabases = databases
    .map((db) => db.name)
    .filter((name) => name.startsWith("trinacria_"));
  console.log(JSON.stringify({ database: "trinacria_cms", resetPlan: oldDatabases }, null, 2));
  if (process.argv.includes("--reset")) {
    const port = await availablePort();
    const additions = {};
    if (!process.env.CMS_SECURE_PAYLOAD_KEYS_JSON) {
      additions.CMS_SECURE_PAYLOAD_ACTIVE_KEY_ID = "local-v1";
      additions.CMS_SECURE_PAYLOAD_KEYS_JSON = JSON.stringify({
        "local-v1": randomBytes(32).toString("base64")
      });
    }
    if (Object.keys(additions).length) {
      let text = await readFile(envFile, "utf8");
      for (const [key, value] of Object.entries(additions)) {
        text = text.replace(new RegExp(`^${key}=.*\\r?\\n?`, "gm"), "");
        text += `\n${key}='${value}'\n`;
        process.env[key] = value;
      }
      await writeFile(envFile, text, { mode: 0o600 });
      await chmod(envFile, 0o600);
    }
    Object.assign(process.env, {
      PLAYGROUND_CLUSTER_ENABLED: "false",
      PLAYGROUND_TEAM_ONBOARDING_PLUGIN: "0",
      PLAYGROUND_EVENT_SMOKE: "0",
      HTTP_HOST: "127.0.0.1",
      HTTP_PORT: String(port),
      OBSERVABILITY_ENABLED: "false"
    });
    await database.dropDatabase();
    app = await createPlaygroundCmsApp();
    assert.equal(app.handle.startupMode, "cms");
    const password = process.env.MOCK_ADMIN_PASSWORD ?? randomBytes(18).toString("base64url");
    const email = "admin@trinacria.local";
    const baseUrl = `http://127.0.0.1:${port}`;
    const publicSdk = createCmsSdkClient({ baseUrl });
    await publicSdk.installation.bootstrapInstallation({
      body: {
        firstName: "Admin",
        lastName: "Demo",
        email,
        password,
        confirmPassword: password,
        dataMode: "empty",
        siteName: "Trinacria Demo",
        siteTagline: "Il tuo CMS modulare, pronto da esplorare",
        locale: "it",
        timezone: "Europe/Rome"
      }
    });
    const login = await publicSdk.auth.loginWithPassword({ body: { email, password } });
    const sdk = createCmsSdkClient({ baseUrl, getAccessToken: () => login.data.accessToken });
    const admin = (await sdk.auth.getAuthenticatedUser()).data;
    assert.equal((await sdk.editorial.listEditorialEntries()).data.length, 0);
    const users = [];
    for (const [firstName, lastName, roleCode] of [
      ["Giulia", "Rossi", "content-manager"],
      ["Marco", "Costa", "reviewer"],
      ["Sara", "Greco", "author"]
    ]) {
      const user = (
        await sdk.users.createUser({
          body: {
            email: `${firstName.toLowerCase()}@trinacria.local`,
            firstName,
            lastName
          }
        })
      ).data;
      await sdk.security.assignUserRole({ path: { id: user.id }, body: { roleCode } });
      users.push(user);
    }
    // Match the initial provider root; opaque asset keys preserve older backup files.
    const storageRoot = ".trinacria/media";
    await setting(sdk, "media-pack:storage:local_root", resolve(storageRoot));
    const directory = (
      await sdk.media.createMediaDirectory({
        body: {
          name: "Immagini demo",
          visibility: "public"
        }
      })
    ).data;
    const media = [];
    for (const [filename, color] of [
      ["paesaggio-demo.png", [42, 116, 100]],
      ["redazione-demo.png", [64, 94, 158]],
      ["piattaforma-demo.png", [164, 92, 52]]
    ]) {
      const bytes = mockPng(color);
      const upload = (
        await sdk.media.startMediaUpload({
          body: {
            filename,
            mimeType: "image/png",
            byteSize: bytes.length,
            directoryId: directory.id,
            checksumSha256: createHash("sha256").update(bytes).digest("hex")
          }
        })
      ).data;
      const path = { id: upload.session.id };
      await sdk.media.receiveMediaUploadContent({ path, body: bytes });
      const asset = (await sdk.media.completeMediaUpload({ path })).data;
      await sdk.media.updateMediaAsset({ path: { id: asset.id }, body: { visibility: "public" } });
      media.push(asset);
    }
    const models = {};
    const defaults = (await sdk.editorial.listEditorialContentTypes()).data;
    for (const [key, name, workflowId] of [
      ["page", "Pagine", "direct"],
      ["article", "Articoli", "review"],
      ["service", "Servizi", "direct"]
    ]) {
      const definition = {
        key,
        name,
        workflowId,
        description: `Modello dimostrativo: ${name.toLowerCase()}`,
        fields: [
          {
            key: "excerpt",
            label: "Introduzione",
            type: "text",
            required: true,
            multiple: false
          },
          {
            key: "category",
            label: "Categoria",
            type: "text",
            required: false,
            multiple: false
          },
          {
            key: "internal_notes",
            label: "Note interne",
            type: "text",
            required: false,
            multiple: false
          }
        ],
        delivery: {
          enabled: true,
          publicFields: ["excerpt", "category"],
          exposeTitle: true,
          exposeSlug: true,
          exposeBody: true
        }
      };
      const existing = defaults.find((model) => model.key === key);
      if (existing) {
        delete definition.key;
        models[key] = (
          await sdk.editorial.updateEditorialContentType({
            path: { id: existing.id },
            body: definition
          })
        ).data;
      } else
        models[key] = (await sdk.editorial.createEditorialContentType({ body: definition })).data;
    }
    const entries = [];
    const content = [
      [
        "page",
        "chi-siamo",
        "Chi siamo",
        "Un team che costruisce strumenti semplici per gestire contenuti.",
        "Azienda",
        "published"
      ],
      [
        "page",
        "contatti",
        "Contatti",
        "Scrivici a demo@example.com per conoscere il progetto.",
        "Azienda",
        "published"
      ],
      [
        "page",
        "la-piattaforma",
        "La piattaforma",
        "Contenuti, media e plugin in un unico backoffice.",
        "Prodotto",
        "published"
      ],
      [
        "page",
        "nuova-homepage",
        "Nuova homepage",
        "Una pagina in lavorazione per provare l'editor.",
        "Azienda",
        "draft"
      ],
      [
        "article",
        "benvenuti-in-trinacria",
        "Benvenuti in Trinacria",
        "Un primo sguardo al CMS modulare e al suo backoffice.",
        "Novità",
        "published"
      ],
      [
        "article",
        "organizzare-la-redazione",
        "Organizzare la redazione",
        "Modelli, ruoli e workflow aiutano il lavoro del team.",
        "Guide",
        "published"
      ],
      [
        "article",
        "pubblicare-con-sicurezza",
        "Pubblicare con sicurezza",
        "Le copie pubblicate rendono esplicito cosa vede il visitatore.",
        "Guide",
        "published"
      ],
      [
        "article",
        "gestire-la-libreria-media",
        "Gestire la libreria media",
        "Carica file e organizza gli asset in cartelle.",
        "Guide",
        "published"
      ],
      [
        "article",
        "plugin-e-integrazioni",
        "Plugin e integrazioni",
        "Estendi il CMS usando i contratti dei servizi dichiarati.",
        "Sviluppo",
        "in_review"
      ],
      [
        "article",
        "idee-per-il-prossimo-rilascio",
        "Idee per il prossimo rilascio",
        "Una bozza per raccogliere idee e miglioramenti.",
        "Novità",
        "draft"
      ],
      [
        "service",
        "siti-editoriali",
        "Siti editoriali",
        "Un sito pubblico collegato ai contenuti del CMS.",
        "Servizi",
        "published"
      ],
      [
        "service",
        "integrazioni-su-misura",
        "Integrazioni su misura",
        "Plugin locali per collegare le esigenze del tuo progetto.",
        "Servizi",
        "published"
      ],
      [
        "service",
        "formazione-team",
        "Formazione del team",
        "Un percorso per imparare a gestire modelli e pubblicazioni.",
        "Servizi",
        "published"
      ]
    ];
    for (const [key, slug, title, excerpt, category, state] of content) {
      const entry = (
        await sdk.editorial.createEditorialEntry({
          body: {
            contentTypeId: models[key].id,
            slug,
            title,
            reviewerUserId: admin.id,
            data: { excerpt, category, internal_notes: "Dato mock: visibile solo nel backoffice." },
            body: {
              version: 1,
              blocks: [
                { id: `${slug}-intro`, type: "paragraph", version: 1, data: { text: excerpt } },
                {
                  id: `${slug}-detail`,
                  type: "paragraph",
                  version: 1,
                  data: {
                    text: "Questo contenuto dimostrativo può essere modificato, revisionato e pubblicato dal backoffice."
                  }
                }
              ]
            }
          }
        })
      ).data;
      const path = { id: entry.id };
      if (key === "article" && state !== "draft") {
        await sdk.editorial.submitEditorialEntry({ path });
        if (state === "published") await sdk.editorial.approveEditorialEntry({ path });
      }
      if (state === "published") await sdk.editorial.publishEditorialEntry({ path });
      entries.push({ id: entry.id, key, slug, state });
    }
    await setting(sdk, "editorial-pack:site:navigation", [
      { label: "Home", href: "/" },
      { label: "Chi siamo", contentTypeKey: "page", slug: "chi-siamo" },
      { label: "La piattaforma", contentTypeKey: "page", slug: "la-piattaforma" },
      { label: "Contatti", contentTypeKey: "page", slug: "contatti" }
    ]);
    for (const key of Object.keys(models)) {
      const published = (await publicSdk.delivery.listPublishedEntries({ path: { key } })).data;
      assert.equal(
        published.length,
        entries.filter((e) => e.key === key && e.state === "published").length
      );
      assert.ok(!JSON.stringify(published).includes("Dato mock: visibile solo"));
    }
    assert.equal((await sdk.users.listUsers()).data.length, 4);
    assert.equal(
      (await sdk.editorial.listEditorialEntries({ query: { limit: 100 } })).data.length,
      13
    );
    assert.equal((await publicSdk.delivery.getPublicNavigation()).data.length, 4);
    const image = await publicSdk.delivery.getPublicMediaContent({ path: { id: media[0].id } });
    assert.deepEqual(Buffer.from(image), mockPng([42, 116, 100]));
    await sdk.auth.logoutSession();
    await app.handle.shutdown();
    app = undefined;
    // Remove project test databases only after the rebuilt CMS has passed API checks.
    for (const name of oldDatabases)
      if (name !== "trinacria_cms") {
        await client.db(name).dropDatabase();
      }
    const remaining = (await database.admin().listDatabases()).databases
      .map((db) => db.name)
      .filter((name) => name.startsWith("trinacria_"));
    assert.deepEqual(remaining, ["trinacria_cms"]);
    const output = resolve(".tmp/mock-cms");
    await mkdir(output, { recursive: true });
    await writeFile(`${output}/access.json`, JSON.stringify({ email, password }, null, 2), {
      mode: 0o600
    });
    await chmod(`${output}/access.json`, 0o600);
    const result = {
      database: "trinacria_cms",
      removedTestDatabases: oldDatabases.length - Number(oldDatabases.includes("trinacria_cms")),
      users: 4,
      contentTypes: 3,
      entries: 13,
      published: 10,
      drafts: 2,
      inReview: 1,
      media: media.length,
      navigationItems: 4,
      storageRoot,
      verifiedAt: new Date().toISOString()
    };
    await writeFile(`${output}/result.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    console.log(`Admin credentials saved in ${output}/access.json`);
  } else
    console.log(
      "Dry run only. Stop the CMS, back up its database, then pass --reset to rebuild it."
    );
} finally {
  if (app) await app.handle.shutdown();
  await client.close();
}

async function setting(sdk, key, value) {
  await sdk.settings.upsertSettingValue({ path: { key }, body: { value } });
}

async function availablePort() {
  const server = createServer();
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  const port = server.address().port;
  await new Promise((done, reject) => server.close((error) => (error ? reject(error) : done())));
  return port;
}

// Real PNG bytes: simple colored mock artwork, no external downloads or services.
function mockPng(color) {
  const width = 640,
    height = 360;
  const pixels = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++)
        pixels[y * (width * 3 + 1) + 1 + x * 3 + c] = Math.min(
          255,
          color[c] + Math.floor(x / 20) + Math.floor(y / 12)
        );
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  payload.copy(result, 4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
  return result;
}
