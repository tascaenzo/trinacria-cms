import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { MediaPackMediaModule } from "../src/modules/media/media.module.js";
import { MEDIA_LOCAL_DISK_PROVIDER_TOKEN } from "../src/modules/media/media.tokens.js";
import type { LocalDiskMediaStorageProvider } from "../src/modules/media/providers/local-disk-media-storage.provider.js";

test("cold media provider reads existing bytes from the persisted storage root", async () => {
  const root = await mkdtemp(join(tmpdir(), "trinacria-media-startup-"));
  try {
    const bytes = Buffer.from("existing media survives a CMS restart");
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "assets", "existing.txt"), bytes);
    const definition = MediaPackMediaModule.providers?.find(
      (provider) => provider.token === MEDIA_LOCAL_DISK_PROVIDER_TOKEN
    );
    assert.ok(definition && "useFactory" in definition);
    const config = {
      async getString(key: string) {
        assert.equal(key, "media-pack:storage:local_root");
        return root;
      }
    };
    // Simulate two fresh instances; neither uploads nor a health request initializes storage.
    for (let restart = 0; restart < 2; restart++) {
      const provider = (await definition.useFactory(config)) as LocalDiskMediaStorageProvider;
      const stream = await provider.readObject({ storageKey: "assets/existing.txt" });
      const received = [];
      for await (const chunk of stream) received.push(Buffer.from(chunk));
      assert.deepEqual(Buffer.concat(received), bytes);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
