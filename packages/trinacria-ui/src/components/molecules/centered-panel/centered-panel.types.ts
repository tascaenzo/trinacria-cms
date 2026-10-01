import type { PropsWithChildren, ReactNode } from "react";
export type CenteredPanelProps = PropsWithChildren<{
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
}>;
