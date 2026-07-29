import type { ReactNode } from "react";

export interface ColorSwatchOption {
  value: string;
  label: string;
  backgroundColor: string;
  foregroundColor?: string;
}

export interface ColorSwatchGridProps {
  label: string;
  options: readonly ColorSwatchOption[];
  selected?: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  renderSwatch?: (option: ColorSwatchOption) => ReactNode;
}
