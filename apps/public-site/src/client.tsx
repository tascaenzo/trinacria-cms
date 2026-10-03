import { hydrateRoot } from "react-dom/client";
import { Site } from "./site.js";
import type { SiteProps } from "./site.types.js";
import "./site.css";

const node = document.getElementById("site-data"),
  root = document.getElementById("root");
if (node?.textContent && root)
  hydrateRoot(root, <Site {...(JSON.parse(node.textContent) as SiteProps)} />);
