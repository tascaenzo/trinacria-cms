import { HttpController, response } from "@trinacria/http";
import type { CmsSwaggerUiConfig } from "../../contracts/cms-starter.js";

export class CmsSwaggerController extends HttpController {
  constructor(private readonly config: CmsSwaggerUiConfig) {
    super();
  }

  routes() {
    return this.router()
      .get(this.config.path ?? "/docs", this.renderDocs, {
        docs: {
          excludeFromOpenApi: true
        }
      })
      .build();
  }

  private renderDocs = async () => {
    const title = this.config.title ?? "Trinacria CMS API Docs";
    const openApiJsonPath = this.config.openApiJsonPath ?? "/openapi.json";
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "${escapeJs(openApiJsonPath)}",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`;
    return response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJs(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
