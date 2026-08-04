import type { InputHTMLAttributes } from "react";

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  clearLabel?: string;
  searchLabel?: string;
}
