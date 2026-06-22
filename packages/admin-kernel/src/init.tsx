import React from "react";
import ReactDOM from "react-dom/client";
import { BackofficeApp } from "./backoffice-app.js";
import type { BackofficeModule } from "./module.js";
import {
  configureBackofficeNavigation,
  migrateLegacyHashNavigation
} from "./runtime/backoffice-navigation-state.js";
import { configureBackofficeSdk } from "./runtime/cms-sdk.js";

export interface MountBackofficeOptions {
  apiBaseUrl?: string;
  basePath?: string;
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
  configureBackofficeNavigation({
    basePath: options.basePath
  });
  migrateLegacyHashNavigation();

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <BackofficeApp modules={options.modules} />
    </React.StrictMode>
  );

  return root;
}
