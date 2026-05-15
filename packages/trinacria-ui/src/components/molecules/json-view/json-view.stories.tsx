import type { Meta, StoryObj } from "@storybook/react-vite";
import { JsonView } from "./json-view.js";

const meta = { title: "Display/Data/JsonView", component: JsonView } satisfies Meta<
  typeof JsonView
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Payload: Story = {
  render: () => (
    <JsonView
      title="Runtime payload"
      value={{ pluginId: "core.settings", capabilities: ["kernel.settings.manage"], healthy: true }}
    />
  )
};
