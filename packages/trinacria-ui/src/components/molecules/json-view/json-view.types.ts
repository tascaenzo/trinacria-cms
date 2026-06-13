import type { HTMLAttributes } from "react";
import type { DialogProps } from "../dialog/dialog.types.js";

export interface JsonViewProps extends HTMLAttributes<HTMLElement> {
  copiedLabel?: string;
  copyErrorLabel?: string;
  copyLabel?: string;
  defaultExpandedDepth?: number;
  expandAllLabel?: string;
  collapseAllLabel?: string;
  showToolbar?: boolean;
  title?: string;
  value: unknown;
}

export interface JsonViewDialogProps {
  closeLabel?: string;
  closeShortcutLabel?: string;
  description?: string;
  onClose: () => void;
  open: boolean;
  payloadTitle?: string;
  title: string;
  value: unknown;
  variant?: DialogProps["variant"];
  width?: DialogProps["width"];
}
