import type { PropsWithChildren, ReactNode } from "react";
import type { IconName } from "../../atoms/icon/icon.js";
import type { NotificationTone } from "../notification/notification.types.js";

export interface ToastInput {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  tone?: NotificationTone;
  icon?: IconName | null;
  meta?: ReactNode;
  action?: ReactNode;
  duration?: number;
}

export interface ToastRecord extends ToastInput {
  id: string;
}

export interface ToastProviderProps extends PropsWithChildren {
  placement?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  maxVisible?: number;
}

export interface ToastContextValue {
  toasts: readonly ToastRecord[];
  pushToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}
