export type OperationActor =
  | { readonly kind: "user"; readonly subjectId: string }
  | { readonly kind: "plugin"; readonly pluginId: string }
  | { readonly kind: "system"; readonly purpose: string };

/** Created by trusted host adapters, never parsed from a request body. */
export interface OperationContext {
  readonly actor: OperationActor;
  readonly source: "http" | "plugin" | "job" | "cli";
  readonly requestId: string;
  /** Named operation fixed by the runtime binding, never by business input. */
  readonly operation?: string;
  readonly workspaceId?: string;
  readonly delegation?: { readonly userId: string };
}
export interface OperationTarget {
  readonly ownerPluginId: string;
  readonly resource: string;
  readonly action: string;
  readonly resourceId?: string;
}
export interface OperationAuthorizer {
  assert(context: OperationContext, target: OperationTarget): Promise<void>;
  /** Authorizes every target before work and wraps its lifecycle. Without run, facades call assert. */
  run?<T>(
    context: OperationContext,
    targets: readonly OperationTarget[],
    work: () => Promise<T>
  ): Promise<T>;
}
export type ApplicationOperations<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? K : never]: T[K] extends (
    ...args: infer A
  ) => infer R
    ? (context: OperationContext, ...args: A) => Promise<Awaited<R>>
    : never;
};
