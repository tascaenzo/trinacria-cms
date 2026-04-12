import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../../atoms/badge/badge.js";
import { SummaryCard, SummaryGrid } from "./summary-grid.js";

const meta = { title: "Display/Data/SummaryGrid", component: SummaryGrid } satisfies Meta<typeof SummaryGrid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DashboardLike: Story = {
  render: () => (
    <SummaryGrid>
      <SummaryCard label="Installed plugins" value="12" description="Plugin attivi nel runtime" />
      <SummaryCard label="Capabilities" value="47" description="Capabilities registrate" />
      <SummaryCard label="System state" value="Healthy" badge={<Badge tone="success">Success</Badge>} />
      <SummaryCard label="Admin model" value="Kernel-first" description="Shell e policy centralizzate" />
    </SummaryGrid>
  )
};
