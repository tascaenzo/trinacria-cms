import { createCmsSdkClient } from "@trinacria-cms/sdk";

type CmsClient = ReturnType<typeof createCmsSdkClient>;

export interface ConfigureBackofficeSdkOptions {
  baseUrl?: string;
  sdk?: ReturnType<typeof createCmsSdkClient>;
}

/**
 * The admin runtime exposes a stable SDK proxy. The shell can replace the
 * underlying client during bootstrap without making early imports stale.
 */
let currentCms: CmsClient = createDefaultCmsClient("/cms");

export const cms: CmsClient = new Proxy({} as CmsClient, {
  get(_target, property, receiver) {
    return Reflect.get(currentCms, property, receiver);
  }
});

function createDefaultCmsClient(baseUrl: string): CmsClient {
  return createCmsSdkClient({
    baseUrl,
    credentials: "include"
  });
}

export function configureBackofficeSdk(options: ConfigureBackofficeSdkOptions = {}): CmsClient {
  currentCms = options.sdk ?? createDefaultCmsClient(options.baseUrl ?? "/cms");
  return currentCms;
}
