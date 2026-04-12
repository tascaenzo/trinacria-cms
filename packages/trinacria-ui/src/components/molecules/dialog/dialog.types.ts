import type { PropsWithChildren, ReactNode } from "react";

export interface DialogProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
  variant?: "modal" | "drawer";
  eyebrow?: string;
  closeLabel?: string;
}
