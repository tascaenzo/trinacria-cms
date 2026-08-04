import type { Meta, StoryObj } from "@storybook/react-vite";
import { SelectableCard } from "./selectable-card.js";

const meta = {
  title: "Navigation/SelectableCard",
  component: SelectableCard
} satisfies Meta<typeof SelectableCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Editorial pack"
  }
};

export const Selected: Story = {
  args: {
    children: "Editorial pack",
    selected: true
  }
};
