# @trinacria-cms/email-pack

Official Trinacria CMS plugin. Import the factory from the package root and register
it with `startCmsApp`. Kernel and Core are required host dependencies. Host-only
repositories and module implementations are available through `/runtime`.

Browser hosts import trusted renderers from `/admin` and declarative contributions
from `/admin-manifest`. Install React, ReactDOM, SDK and trinacria-ui explicitly in
the frontend. They remain optional peers for a backend-only deployment.

See the repository documentation under `docs/cms/architecture/plugin-platform/`.
