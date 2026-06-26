/**
 * A capability or permission guard controls whether a route, navigation item,
 * widget, settings section, resource, or action should be visible.
 */
export interface AdminAccessGuard {
  pluginId?: string;
  capability?: string;
  permissionKey?: string;
}
