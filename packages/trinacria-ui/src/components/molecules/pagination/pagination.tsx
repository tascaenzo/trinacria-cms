import { cn } from "../../../utils/class-names.js";
import { Icon } from "../../atoms/icon/icon.js";
import { Select } from "../../atoms/select/select.js";
import { ButtonBase } from "../../primitives/button-base/button-base.js";
import type { PaginationProps } from "./pagination.types.js";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function buildPages(
  page: number,
  totalPages: number,
  siblingCount: number
): Array<number | "ellipsis"> {
  if (totalPages <= 1) {
    return [1];
  }

  const firstPage = 1;
  const lastPage = totalPages;
  const leftSibling = Math.max(page - siblingCount, firstPage);
  const rightSibling = Math.min(page + siblingCount, lastPage);
  const showLeftEllipsis = leftSibling > firstPage + 1;
  const showRightEllipsis = rightSibling < lastPage - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, Math.min(1 + siblingCount * 2 + 2, totalPages)), "ellipsis", lastPage];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    return [
      firstPage,
      "ellipsis",
      ...range(Math.max(totalPages - (siblingCount * 2 + 2), 1), totalPages)
    ];
  }

  if (showLeftEllipsis && showRightEllipsis) {
    return [firstPage, "ellipsis", ...range(leftSibling, rightSibling), "ellipsis", lastPage];
  }

  return range(1, totalPages);
}

export function Pagination({
  className,
  mobilePageLabel = (current, total) => `Pagina ${current} di ${total}`,
  nextLabel = "Successiva",
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  pageLabel = (item) => `Vai a pagina ${item}`,
  pageSizeLabel = "Righe per pagina",
  paginationLabel = "Paginazione",
  previousLabel = "Precedente",
  siblingCount = 1,
  summaryLabel,
  totalItems,
  ...props
}: PaginationProps) {
  const safeTotalItems = Number.isFinite(totalItems) ? Math.max(0, totalItems) : 0;
  const safePageSizeOptions = pageSizeOptions.filter(
    (option) => Number.isFinite(option) && option > 0
  );
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? pageSize : (safePageSizeOptions[0] ?? 1);
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  const currentPage = clamp(page, 1, totalPages);
  const start = safeTotalItems === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const end = safeTotalItems === 0 ? 0 : Math.min(currentPage * safePageSize, safeTotalItems);
  const pages = buildPages(currentPage, totalPages, siblingCount);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const summary =
    summaryLabel?.({ end, start, totalItems: safeTotalItems }) ??
    `${start}-${end} di ${safeTotalItems}`;

  return (
    <nav
      aria-label={paginationLabel}
      className={cn(
        "flex flex-col gap-3 border-t border-(--color-border) pt-4 md:flex-row md:items-center md:justify-between",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-(--color-ink-muted)">{summary}</p>
        {onPageSizeChange ? (
          <div className="w-full sm:w-35">
            <Select
              aria-label={pageSizeLabel}
              value={safePageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {(safePageSizeOptions.length ? safePageSizeOptions : [safePageSize]).map((option) => (
                <option key={option} value={option}>
                  {option} / pagina
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ButtonBase
          variant="ghost"
          size="sm"
          disabled={!canGoPrevious}
          onClick={() => onPageChange?.(currentPage - 1)}
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          <span>{previousLabel}</span>
        </ButtonBase>

        <div className="hidden items-center gap-1 md:flex">
          {pages.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="inline-flex h-8 min-w-8 items-center justify-center px-2 text-xs font-medium text-(--color-ink-subtle)"
              >
                ...
              </span>
            ) : (
              <ButtonBase
                key={item}
                variant={item === currentPage ? "primary" : "ghost"}
                size="sm"
                onClick={() => onPageChange?.(Number(item))}
                aria-label={pageLabel(item)}
                aria-current={item === currentPage ? "page" : undefined}
                className="min-w-8 px-2.5"
              >
                {item}
              </ButtonBase>
            )
          )}
        </div>

        <div className="inline-flex items-center rounded-(--radius-control) border border-(--color-border) bg-(--color-panel-soft) px-3 py-1 text-xs font-medium text-(--color-ink-muted) md:hidden">
          {mobilePageLabel(currentPage, totalPages)}
        </div>

        <ButtonBase
          variant="ghost"
          size="sm"
          disabled={!canGoNext}
          onClick={() => onPageChange?.(currentPage + 1)}
        >
          <span>{nextLabel}</span>
          <Icon name="chevron-right" className="h-4 w-4" />
        </ButtonBase>
      </div>
    </nav>
  );
}
