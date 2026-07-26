/**
 * Compatibility names for older resource screens. They intentionally reuse the
 * canonical DataTable primitives so every admin table shares density, borders,
 * hover states and responsive behaviour.
 */
export {
  DataTable as ResourceTable,
  DataTableBody as ResourceTableBody,
  DataTableCell as ResourceTableCell,
  DataTableHead as ResourceTableHead,
  DataTableHeadCell as ResourceTableHeadCell,
  DataTableHeaderRow as ResourceTableHeaderRow,
  DataTablePrimaryCell as ResourceTablePrimaryCell,
  DataTableRow as ResourceTableRow,
  DataTableTable as ResourceTableElement
} from "../data-table/data-table.js";
