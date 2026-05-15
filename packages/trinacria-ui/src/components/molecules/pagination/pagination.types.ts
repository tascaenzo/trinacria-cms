import type { HTMLAttributes } from "react";

export interface PaginationProps extends HTMLAttributes<HTMLDivElement> {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  siblingCount?: number;
  previousLabel?: string;
  nextLabel?: string;
  summaryLabel?: (params: { start: number; end: number; totalItems: number }) => string;
}
