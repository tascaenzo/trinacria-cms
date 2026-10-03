# Settings Module

The module owns namespaced settings, encrypted secrets, runtime configuration and
signed HTTP caller authentication. Installed in-process plugins use
`TrustedPluginAccessPolicyService`: runtime manifests, declared dependencies and active
owners authorize integrations without database grant approvals or transaction fences.
User contexts and delegations retain user permissions in the application facade.

`PluginSettingsHost` exposes only the owner's declared nonsecret settings. Secret reads
remain separate application operations. The vault retains encryption, expiry, explicit
producer-authorized consumers and atomic single-use claims.

`ExternalPluginHttpAccessPolicyService` checks persisted access decisions for signed
external HTTP settings clients only.
Grants live in the dedicated `plugin_access_grants` collection, never a settings array.
Its management APIs retain administrator permissions, CAS revisions and audit. It is
not the policy used for local event subscriptions, payload claims or service calls;
the standard admin no longer presents a plugin approval center. No official local
integration grants are provisioned during startup.

See the [current trust decision](../../../../../docs/cms/architecture/plugin-platform/trusted-plugin-model.md).
