import type { Meta, StoryObj } from "@storybook/react-vite";
import { Panel } from "./panel.js";

const meta = { title: "Primitives/Surface/Panel", component: Panel } satisfies Meta<typeof Panel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-3">
      <Panel className="p-4">Default panel</Panel>
      <Panel tone="soft" className="p-4">Soft panel</Panel>
      <Panel tone="dashed" className="p-4">Dashed panel</Panel>
    </div>
  )
};
