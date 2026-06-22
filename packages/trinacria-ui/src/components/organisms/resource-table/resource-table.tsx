import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { BodyText } from "../../primitives/text/text.js";
import { cn } from "../../../utils/class-names.js";
import type {
  ResourceTableCellProps,
  ResourceTableElementProps,
  ResourceTableHeadCellProps,
  ResourceTableProps
} from "./resource-table.types.js";

export function ResourceTable({
  children,
  className,
  empty,
  mobile,
  ...props
}: PropsWithChildren<ResourceTableProps>) {
  const hasContent = Boolean(children);

  return (
    <>
      {mobile}
      <div
        className={cn(
          "hidden overflow-x-auto rounded-[var(--radius-panel)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-surface)] md:block",
          className
        )}
        {...props}
      >
        {hasContent ? children : empty}
      </div>
    </>
  );
}

export function ResourceTableElement({ children, className, ...props }: ResourceTableElementProps) {
  return (
    <table
      className={cn("min-w-full border-separate border-spacing-0 text-sm", className)}
      {...props}
    >
      {children}
    </table>
  );
}

export function ResourceTableHeaderRow({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLTableRowElement>>) {
  return (
    <tr
      className={cn(
        "bg-[color:var(--color-surface)] text-left text-[color:var(--color-ink-subtle)] shadow-[inset_0_-1px_0_var(--color-border)]",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function ResourceTableHeadCell({
  children,
  className,
  ...props
}: ResourceTableHeadCellProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-medium leading-5 text-[color:var(--color-ink-subtle)]",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function ResourceTableRow({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLTableRowElement>>) {
  return (
    <tr
      className={cn(
        "group transition-colors [&>td]:border-b [&>td]:border-[color:var(--color-border)] last:[&>td]:border-b-0 hover:bg-[color:var(--color-panel-soft)]/70 focus-within:bg-[color:var(--color-panel-soft)]",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function ResourceTableCell({ children, className, ...props }: ResourceTableCellProps) {
  return (
    <td
      className={cn("px-4 py-4 align-top leading-6 text-[color:var(--color-ink)]", className)}
      {...props}
    >
      {children}
    </td>
  );
}

export function ResourceTablePrimaryCell({
  children,
  className,
  meta,
  ...props
}: ResourceTableCellProps & { meta?: ReactNode }) {
  return (
    <ResourceTableCell className={className} {...props}>
      <div className="min-w-0">
        <p className="break-words font-medium text-[color:var(--color-ink)]">{children}</p>
        {meta ? <BodyText className="mt-1">{meta}</BodyText> : null}
      </div>
    </ResourceTableCell>
  );
}
