import type { HTMLAttributes } from "react";

export interface JsonViewProps extends HTMLAttributes<HTMLPreElement> {
  title?: string;
  value: unknown;
}
