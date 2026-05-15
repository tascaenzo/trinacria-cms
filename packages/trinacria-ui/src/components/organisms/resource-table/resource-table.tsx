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
      <div className={cn("hidden overflow-x-auto md:block", className)} {...props}>
        {hasContent ? children : empty}
      </div>
    </>
  );
}

export function ResourceTableElement({ children, className, ...props }: ResourceTableElementProps) {
  return (
    <table className={cn("min-w-full text-sm", className)} {...props}>
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
        "border-b border-[color:var(--color-border)] text-left text-[color:var(--color-ink-subtle)]",
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
    <th className={cn("px-4 py-3 font-medium", className)} {...props}>
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
      className={cn("border-b border-[color:var(--color-border)] last:border-b-0", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function ResourceTableCell({ children, className, ...props }: ResourceTableCellProps) {
  return (
    <td className={cn("px-4 py-4", className)} {...props}>
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
      <div>
        <p className="font-medium text-[color:var(--color-ink)]">{children}</p>
        {meta ? <BodyText className="mt-1">{meta}</BodyText> : null}
      </div>
    </ResourceTableCell>
  );
}
