# @trinacria-cms/admin-kernel

Shared backoffice kernel for Trinacria CMS.

This package owns:

- admin contracts
- shell bootstrap
- SDK initialization
- official admin routes
- admin resource registry
- session bootstrap and runtime discovery
- plugin runtime operations UI driven by backend `operations[]`
- plugin source, dependency, failure and lifecycle event diagnostics

Host applications should stay thin and only provide:

- CSS/theme
- local module registration
- mount-time API base configuration
