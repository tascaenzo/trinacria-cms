import type { Meta, StoryObj } from "@storybook/react-vite";
import { Panel } from "./panel.js";

const meta = { title: "Primitives/Surface/Panel", component: Panel } satisfies Meta<typeof Panel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-4">
      <Panel className="p-4">Default panel</Panel>
      <Panel tone="soft" className="p-4">
        Soft panel
      </Panel>
      <Panel tone="dashed" className="p-4">
        Dashed panel
      </Panel>
      <Panel
        tone="custom"
        className="border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] p-4"
      >
        Custom semantic panel
      </Panel>
    </div>
  )
};
