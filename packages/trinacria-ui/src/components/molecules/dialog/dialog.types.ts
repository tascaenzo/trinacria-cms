import type { PropsWithChildren, ReactNode } from "react";

export interface DialogProps extends PropsWithChildren {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  headerActions?: ReactNode;
  width?: "md" | "lg" | "xl" | "fullscreen";
  variant?: "modal" | "drawer";
  chrome?: "standard" | "workspace";
  eyebrow?: ReactNode;
  closeLabel?: string;
  closeShortcutLabel?: string;
  closeVariant?: "button" | "icon";
}
