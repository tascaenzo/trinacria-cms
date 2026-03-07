import { createCmsSdkClient } from "@trinacria-cms/sdk";
import { getStoredAccessToken } from "./auth-session.js";

type CmsClient = ReturnType<typeof createCmsSdkClient>;

export interface ConfigureBackofficeSdkOptions {
  baseUrl?: string;
  sdk?: ReturnType<typeof createCmsSdkClient>;
}

/**
 * The admin runtime uses a single shared SDK instance. The shell configures it
 * once during bootstrap so page modules can stay free from app-local wiring.
 */
export let cms: CmsClient = createDefaultCmsClient("/cms");

function createDefaultCmsClient(baseUrl: string): CmsClient {
  return createCmsSdkClient({
    baseUrl,
    credentials: "include",
    getAccessToken: () => getStoredAccessToken(),
  });
}

export function configureBackofficeSdk(
  options: ConfigureBackofficeSdkOptions = {},
): CmsClient {
  cms = options.sdk ?? createDefaultCmsClient(options.baseUrl ?? "/cms");
  return cms;
}
