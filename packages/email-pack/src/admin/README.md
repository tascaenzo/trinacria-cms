# Email Pack Admin Renderers

This folder contains React renderers owned by `email-pack`.

The plugin manifest declares serializable admin surfaces through `componentRef`
values such as `email-pack:email-template-manager`. The concrete React components
live here and are exported through `EMAIL_PACK_ADMIN_RENDERERS`.

`admin-kernel` must not import these components directly. The host backoffice
application wires this registry into the shell through `BackofficeModule.renderers`.
