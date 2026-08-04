import type { HTMLAttributes } from "react";

export interface PaginationProps extends HTMLAttributes<HTMLElement> {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  siblingCount?: number;
  previousLabel?: string;
  nextLabel?: string;
  paginationLabel?: string;
  pageLabel?: (page: number) => string;
  pageSizeLabel?: string;
  mobilePageLabel?: (page: number, totalPages: number) => string;
  summaryLabel?: (params: { start: number; end: number; totalItems: number }) => string;
}
