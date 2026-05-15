import type {
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes
} from "react";

export interface DataTableProps extends HTMLAttributes<HTMLDivElement> {
  empty?: ReactNode;
  mobile?: ReactNode;
}

export type DataTableTableProps = PropsWithChildren<TableHTMLAttributes<HTMLTableElement>>;
export type DataTableHeadProps = PropsWithChildren<HTMLAttributes<HTMLTableSectionElement>>;
export type DataTableBodyProps = PropsWithChildren<HTMLAttributes<HTMLTableSectionElement>>;
export type DataTableCellProps = PropsWithChildren<TdHTMLAttributes<HTMLTableCellElement>>;
export type DataTableHeadCellProps = PropsWithChildren<ThHTMLAttributes<HTMLTableCellElement>>;
