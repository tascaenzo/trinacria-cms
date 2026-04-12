import type {
  HTMLAttributes,
  LabelHTMLAttributes,
  PropsWithChildren
} from "react";

export type FieldGroupProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;
export type FieldProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;
export type FieldLabelProps = PropsWithChildren<LabelHTMLAttributes<HTMLLabelElement>>;
export type FieldDescriptionProps = PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>;
