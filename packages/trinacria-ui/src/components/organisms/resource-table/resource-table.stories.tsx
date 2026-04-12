import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../../atoms/badge/badge.js";
import { Button } from "../../atoms/button/button.js";
import { MobileRecordCard, MobileRecordField, MobileRecordList } from "../../molecules/mobile-record/mobile-record.js";
import {
  ResourceTable,
  ResourceTableCell,
  ResourceTableElement,
  ResourceTableHeadCell,
  ResourceTableHeaderRow,
  ResourceTablePrimaryCell,
  ResourceTableRow
} from "./resource-table.js";

const meta = { title: "Display/Data/ResourceTable", component: ResourceTable } satisfies Meta<typeof ResourceTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const UsersLikeLayout: Story = {
  render: () => (
    <ResourceTable
      mobile={
        <MobileRecordList>
          <MobileRecordCard
            title="Mario Rossi"
            subtitle="mario@example.com"
            badges={<Badge tone="success">Active</Badge>}
            actions={<Button variant="secondary" className="w-full">Suspend</Button>}
          >
            <MobileRecordField label="Updated" value="2026-04-10 10:45" />
          </MobileRecordCard>
        </MobileRecordList>
      }
    >
      <ResourceTableElement>
        <thead>
          <ResourceTableHeaderRow>
            <ResourceTableHeadCell>User</ResourceTableHeadCell>
            <ResourceTableHeadCell>Status</ResourceTableHeadCell>
            <ResourceTableHeadCell>Updated</ResourceTableHeadCell>
            <ResourceTableHeadCell>Action</ResourceTableHeadCell>
          </ResourceTableHeaderRow>
        </thead>
        <tbody>
          <ResourceTableRow>
            <ResourceTablePrimaryCell meta="mario@example.com">Mario Rossi</ResourceTablePrimaryCell>
            <ResourceTableCell><Badge tone="success">Active</Badge></ResourceTableCell>
            <ResourceTableCell className="text-[color:var(--color-ink-muted)]">2026-04-10 10:45</ResourceTableCell>
            <ResourceTableCell><Button variant="secondary">Suspend</Button></ResourceTableCell>
          </ResourceTableRow>
        </tbody>
      </ResourceTableElement>
    </ResourceTable>
  )
};
