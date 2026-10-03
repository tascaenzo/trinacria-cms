import { createCorePackPlugin } from "@trinacria-cms/core-pack";
import { createEditorialPackPlugin, type EntryRecord } from "@trinacria-cms/editorial-pack";
import { createEmailPackPlugin } from "@trinacria-cms/email-pack";
import { startCmsApp } from "@trinacria-cms/kernel/runtime";
import { createMediaPackPlugin } from "@trinacria-cms/media-pack";
import { createCmsSdkClient } from "@trinacria-cms/sdk";

const sdk = createCmsSdkClient({ baseUrl: "https://fixture.invalid" });
const items = sdk.editorial.listEditorialEntries();
const plugins = [
  createCorePackPlugin(),
  createEditorialPackPlugin(),
  createEmailPackPlugin(),
  createMediaPackPlugin()
];
void [items, plugins, startCmsApp];
const entry: EntryRecord | undefined = undefined;
void entry;
