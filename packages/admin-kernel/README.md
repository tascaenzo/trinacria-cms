# @trinacria-cms/admin-kernel

Shared backoffice kernel for Trinacria CMS.

This package owns:

- admin contracts
- shell bootstrap
- SDK initialization
- official admin routes
- session bootstrap and runtime discovery

Host applications should stay thin and only provide:

- CSS/theme
- local module registration
- mount-time API base configuration
