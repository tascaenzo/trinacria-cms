import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../../atoms/badge/badge.js";
import { Button } from "../../atoms/button/button.js";
import { MobileRecordCard, MobileRecordField, MobileRecordList } from "./mobile-record.js";

const meta = {
  title: "Layout/Responsive/MobileRecord",
  component: MobileRecordList
} satisfies Meta<typeof MobileRecordList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ResourceCards: Story = {
  render: () => (
    <MobileRecordList className="!grid">
      <MobileRecordCard
        title="core.settings"
        subtitle="Gestione impostazioni runtime"
        badges={<Badge tone="success">Healthy</Badge>}
        actions={<Button size="sm">Apri dettaglio</Button>}
      >
        <MobileRecordField label="Versione" value="1.3.0" />
        <MobileRecordField label="Capability" value="kernel.settings.manage" />
      </MobileRecordCard>
    </MobileRecordList>
  )
};
