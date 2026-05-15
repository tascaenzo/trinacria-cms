import React from "react";
import ReactDOM from "react-dom/client";
import { BackofficeApp } from "./backoffice-app.js";
import type { BackofficeModule } from "./module.js";
import { configureBackofficeSdk } from "./runtime/cms-sdk.js";

export interface MountBackofficeOptions {
  apiBaseUrl?: string;
  modules?: readonly BackofficeModule[];
}

/**
 * mountBackoffice gives host apps a single entrypoint: configure SDK access,
 * provide modules, and mount the shared admin application.
 */
export function mountBackoffice(container: Element, options: MountBackofficeOptions = {}) {
  configureBackofficeSdk({
    baseUrl: options.apiBaseUrl
  });

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <BackofficeApp modules={options.modules} />
    </React.StrictMode>
  );

  return root;
}
