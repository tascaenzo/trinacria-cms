import type { PropsWithChildren, ReactNode } from "react";

export interface DialogProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  headerActions?: ReactNode;
  width?: "md" | "lg" | "xl" | "fullscreen";
  variant?: "modal" | "drawer";
  chrome?: "standard" | "workspace";
  eyebrow?: string;
  closeLabel?: string;
  closeShortcutLabel?: string;
  closeVariant?: "button" | "icon";
}
