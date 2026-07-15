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
let currentApiBaseUrl = "/cms";

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
  currentApiBaseUrl = options.baseUrl ?? "/cms";
  currentCms = options.sdk ?? createDefaultCmsClient(currentApiBaseUrl);
  return currentCms;
}

/** Base URL shared by the generated SDK and lightweight runtime endpoints. */
export function getBackofficeApiBaseUrl(): string {
  return currentApiBaseUrl.replace(/\/$/, "");
}
