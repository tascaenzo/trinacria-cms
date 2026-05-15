import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Badge } from "../../atoms/badge/badge.js";
import { Button } from "../../atoms/button/button.js";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeadCell,
  DataTableHeaderRow,
  DataTablePrimaryCell,
  DataTableRow,
  DataTableTable
} from "../../organisms/data-table/data-table.js";
import { Pagination } from "./pagination.js";

const meta = {
  title: "Navigation/Pagination",
  component: Pagination
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

const records = Array.from({ length: 42 }, (_, index) => ({
  id: index + 1,
  key: `worker-${String(index + 1).padStart(2, "0")}`,
  owner: index % 2 === 0 ? "core-pack" : "content-suite",
  status: index % 5 === 0 ? "warning" : "success"
}));

export const Default: Story = {
  render: () => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const start = (page - 1) * pageSize;
    const rows = records.slice(start, start + pageSize);

    return (
      <div className="space-y-4">
        <DataTable>
          <DataTableTable>
            <DataTableHead>
              <DataTableHeaderRow>
                <DataTableHeadCell>Worker</DataTableHeadCell>
                <DataTableHeadCell>Owner</DataTableHeadCell>
                <DataTableHeadCell>Status</DataTableHeadCell>
                <DataTableHeadCell>Action</DataTableHeadCell>
              </DataTableHeaderRow>
            </DataTableHead>
            <DataTableBody>
              {rows.map((record) => (
                <DataTableRow key={record.id}>
                  <DataTablePrimaryCell meta={`Runtime node ${record.id}`}>
                    {record.key}
                  </DataTablePrimaryCell>
                  <DataTableCell className="text-[color:var(--color-ink-muted)]">
                    {record.owner}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge tone={record.status === "success" ? "success" : "warning"}>
                      {record.status === "success" ? "Healthy" : "Review"}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <Button variant="secondary">Inspect</Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTableTable>
        </DataTable>

        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={records.length}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      </div>
    );
  }
};

export const Compact: Story = {
  args: {
    page: 8,
    pageSize: 25,
    totalItems: 312,
    siblingCount: 1
  }
};
