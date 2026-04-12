import type { HTMLAttributes, PropsWithChildren } from "react";

export interface BodyTextProps extends PropsWithChildren<HTMLAttributes<HTMLParagraphElement>> {
  tone?: "default" | "muted" | "subtle";
}
