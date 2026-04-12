import type { PropsWithChildren } from "react";
import { cn } from "../../../utils/class-names.js";
import type { StateStackProps } from "./state-stack.types.js";

export function StateStack({
  children,
  className,
  empty,
  error,
  isEmpty = false,
  isLoading = false,
  loading,
  ...props
}: PropsWithChildren<StateStackProps>) {
  return (
    <div className={cn("grid gap-4", className)} {...props}>
      {error}
      {isLoading ? loading : null}
      {!isLoading && isEmpty ? empty : null}
      {!isLoading && !isEmpty ? children : null}
    </div>
  );
}
