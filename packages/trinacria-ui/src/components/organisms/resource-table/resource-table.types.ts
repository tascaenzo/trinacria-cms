import type { HTMLAttributes, PropsWithChildren, ReactNode, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";

export interface ResourceTableProps extends HTMLAttributes<HTMLDivElement> {
  empty?: ReactNode;
  mobile?: ReactNode;
}

export type ResourceTableElementProps = PropsWithChildren<TableHTMLAttributes<HTMLTableElement>>;
export type ResourceTableCellProps = PropsWithChildren<TdHTMLAttributes<HTMLTableCellElement>>;
export type ResourceTableHeadCellProps = PropsWithChildren<ThHTMLAttributes<HTMLTableCellElement>>;
