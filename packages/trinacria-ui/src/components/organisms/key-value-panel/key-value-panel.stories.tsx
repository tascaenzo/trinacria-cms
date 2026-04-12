import type { Meta, StoryObj } from "@storybook/react-vite";
import { KeyValueItem, KeyValuePanel } from "./key-value-panel.js";

const meta = { title: "Display/Data/KeyValuePanel", component: KeyValuePanel } satisfies Meta<typeof KeyValuePanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <KeyValuePanel>
      <KeyValueItem label="Owner plugin" value="core.settings" />
      <KeyValueItem label="Resolved source" value="kernel override" />
      <KeyValueItem label="Updated at" value="2026-04-10 12:00" />
      <KeyValueItem label="Secret metadata" value="Available" />
    </KeyValuePanel>
  )
};
