import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { BodyText } from "../../primitives/text/text.js";
import { cn } from "../../../utils/class-names.js";
import type {
  DataTableBodyProps,
  DataTableCellProps,
  DataTableHeadCellProps,
  DataTableHeadProps,
  DataTableProps,
  DataTableTableProps
} from "./data-table.types.js";

export function DataTable({
  children,
  className,
  empty,
  mobile,
  ...props
}: PropsWithChildren<DataTableProps>) {
  const hasContent = Boolean(children);

  return (
    <>
      {mobile}
      <div className={cn("hidden overflow-x-auto md:block", className)} {...props}>
        {hasContent ? children : empty}
      </div>
    </>
  );
}

export function DataTableTable({ children, className, ...props }: DataTableTableProps) {
  return (
    <table className={cn("min-w-full text-sm", className)} {...props}>
      {children}
    </table>
  );
}

export function DataTableHead({ children, className, ...props }: DataTableHeadProps) {
  return (
    <thead className={cn(className)} {...props}>
      {children}
    </thead>
  );
}

export function DataTableBody({ children, className, ...props }: DataTableBodyProps) {
  return (
    <tbody className={cn(className)} {...props}>
      {children}
    </tbody>
  );
}

export function DataTableHeaderRow({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLTableRowElement>>) {
  return (
    <tr
      className={cn(
        "border-b border-[color:var(--color-border)] text-left text-[color:var(--color-ink-subtle)]",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function DataTableHeadCell({ children, className, ...props }: DataTableHeadCellProps) {
  return (
    <th className={cn("px-4 py-3 font-medium", className)} {...props}>
      {children}
    </th>
  );
}

export function DataTableRow({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLTableRowElement>>) {
  return (
    <tr
      className={cn(
        "border-b border-[color:var(--color-border)] last:border-b-0 hover:bg-[color:var(--color-panel-soft)]/60",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({ children, className, ...props }: DataTableCellProps) {
  return (
    <td className={cn("px-4 py-4 align-top", className)} {...props}>
      {children}
    </td>
  );
}

export function DataTablePrimaryCell({
  children,
  className,
  meta,
  ...props
}: DataTableCellProps & { meta?: ReactNode }) {
  return (
    <DataTableCell className={className} {...props}>
      <div>
        <p className="font-medium text-[color:var(--color-ink)]">{children}</p>
        {meta ? <BodyText className="mt-1">{meta}</BodyText> : null}
      </div>
    </DataTableCell>
  );
}
