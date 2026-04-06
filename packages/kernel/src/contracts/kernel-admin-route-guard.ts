import type { HttpMiddleware } from "@trinacria/http";

/**
 * Optional integration bridge used by kernel-owned HTTP controllers when they
 * must enforce admin-only access without depending on a specific auth plugin.
 *
 * A host plugin such as `core-pack` can provide the concrete middleware and
 * matching OpenAPI security requirements.
 */
export interface KernelAdminRouteGuard {
  middleware: HttpMiddleware;
  security?: Record<string, string[]>[];
}
