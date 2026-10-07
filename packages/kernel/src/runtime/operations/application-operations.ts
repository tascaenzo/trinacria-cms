import { factoryProvider, type Token } from "@trinacria/core";
import type {
  ApplicationOperations,
  OperationAuthorizer,
  OperationContext,
  OperationTarget
} from "../../contracts/operations.js";
import { CORE_TOKENS } from "../../tokens/core-tokens.js";
import { assertOperationContext } from "./operation-context.js";

export interface ApplicationOperationRule {
  target:
    | OperationTarget
    | ((
        args: readonly unknown[],
        context: OperationContext
      ) => OperationTarget | readonly OperationTarget[]);
  invoke?: (context: OperationContext, args: readonly unknown[]) => unknown;
  prepare?: (
    args: readonly unknown[],
    context: OperationContext
  ) => Promise<readonly unknown[]> | readonly unknown[];
}
/** Explicit, per-domain methods only; no repository or arbitrary business gateway. */
export function createApplicationOperations<T extends object, K extends keyof T>(
  service: T,
  authorizer: OperationAuthorizer,
  rules: Record<K, ApplicationOperationRule>
): ApplicationOperations<Pick<T, K>> {
  const operations: Record<string, unknown> = {};
  for (const [name, rule] of Object.entries(rules) as [string, ApplicationOperationRule][]) {
    operations[name] = async (context: OperationContext, ...args: unknown[]) => {
      assertOperationContext(context);
      // Domain facades use data arguments only. Snapshot before asynchronous policy checks.
      args = structuredClone(args);
      const result = typeof rule.target === "function" ? rule.target(args, context) : rule.target;
      const targets = (Array.isArray(result) ? result : [result]).map((target) =>
        Object.freeze({ ...target })
      );
      const invoke = async () => {
        const prepared = rule.prepare ? await rule.prepare(args, context) : args;
        if (rule.invoke) return rule.invoke(context, prepared);
        const method = (service as Record<string, unknown>)[name] as (
          ...args: unknown[]
        ) => unknown;
        return method.apply(service, [...prepared]);
      };
      if (authorizer.run) return authorizer.run(context, targets, invoke);
      for (const target of targets) await authorizer.assert(context, target);
      return invoke();
    };
  }
  return Object.freeze(operations) as ApplicationOperations<Pick<T, K>>;
}
export function applicationOperationsProvider<T extends object, R>(
  token: Token<R>,
  implementation: Token<T>,
  create: (service: T, authorizer: OperationAuthorizer) => R
) {
  return factoryProvider(token, create, [implementation, CORE_TOKENS.OPERATION_AUTHORIZER]);
}
