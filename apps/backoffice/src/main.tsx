import { mountBackoffice } from "@trinacria-cms/admin-kernel";
import { backofficeOptions } from "./backoffice.init.js";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Backoffice root element not found");
}

mountBackoffice(container, backofficeOptions);
