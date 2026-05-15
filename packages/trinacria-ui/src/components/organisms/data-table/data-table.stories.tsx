import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../../atoms/badge/badge.js";
import { Button } from "../../atoms/button/button.js";
import { EmptyState } from "../../molecules/feedback/feedback.js";
import {
  MobileRecordCard,
  MobileRecordField,
  MobileRecordList
} from "../../molecules/mobile-record/mobile-record.js";
import { Pagination } from "../../molecules/pagination/pagination.js";
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
} from "./data-table.js";

const meta = {
  title: "Data Display/DataTable",
  component: DataTable
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DataTable
      mobile={
        <MobileRecordList>
          <MobileRecordCard
            title="API key: server-sync"
            subtitle="Produzione"
            badges={<Badge tone="success">Active</Badge>}
            actions={
              <Button variant="secondary" className="w-full">
                Inspect
              </Button>
            }
          >
            <MobileRecordField label="Owner" value="core-pack" />
            <MobileRecordField label="Updated" value="17 Apr 2026, 09:20" />
          </MobileRecordCard>
        </MobileRecordList>
      }
    >
      <DataTableTable>
        <DataTableHead>
          <DataTableHeaderRow>
            <DataTableHeadCell>Key</DataTableHeadCell>
            <DataTableHeadCell>Owner</DataTableHeadCell>
            <DataTableHeadCell>Status</DataTableHeadCell>
            <DataTableHeadCell>Action</DataTableHeadCell>
          </DataTableHeaderRow>
        </DataTableHead>
        <DataTableBody>
          <DataTableRow>
            <DataTablePrimaryCell meta="Produzione">API key: server-sync</DataTablePrimaryCell>
            <DataTableCell className="text-[color:var(--color-ink-muted)]">core-pack</DataTableCell>
            <DataTableCell>
              <Badge tone="success">Active</Badge>
            </DataTableCell>
            <DataTableCell>
              <Button variant="secondary">Inspect</Button>
            </DataTableCell>
          </DataTableRow>
        </DataTableBody>
      </DataTableTable>
    </DataTable>
  )
};

export const Empty: Story = {
  render: () => (
    <DataTable empty={<EmptyState text="Nessun record disponibile per il filtro corrente." />}>
      {null}
    </DataTable>
  )
};

export const WithPagination: Story = {
  render: () => (
    <div className="space-y-4">
      <DataTable>
        <DataTableTable>
          <DataTableHead>
            <DataTableHeaderRow>
              <DataTableHeadCell>Key</DataTableHeadCell>
              <DataTableHeadCell>Owner</DataTableHeadCell>
              <DataTableHeadCell>Status</DataTableHeadCell>
              <DataTableHeadCell>Action</DataTableHeadCell>
            </DataTableHeaderRow>
          </DataTableHead>
          <DataTableBody>
            <DataTableRow>
              <DataTablePrimaryCell meta="Produzione">API key: server-sync</DataTablePrimaryCell>
              <DataTableCell className="text-[color:var(--color-ink-muted)]">
                core-pack
              </DataTableCell>
              <DataTableCell>
                <Badge tone="success">Active</Badge>
              </DataTableCell>
              <DataTableCell>
                <Button variant="secondary">Inspect</Button>
              </DataTableCell>
            </DataTableRow>
            <DataTableRow>
              <DataTablePrimaryCell meta="Staging">API key: media-cache</DataTablePrimaryCell>
              <DataTableCell className="text-[color:var(--color-ink-muted)]">
                content-suite
              </DataTableCell>
              <DataTableCell>
                <Badge tone="warning">Review</Badge>
              </DataTableCell>
              <DataTableCell>
                <Button variant="secondary">Inspect</Button>
              </DataTableCell>
            </DataTableRow>
          </DataTableBody>
        </DataTableTable>
      </DataTable>

      <Pagination page={2} pageSize={10} totalItems={48} />
    </div>
  )
};
