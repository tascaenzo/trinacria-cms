import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconButton } from "./icon-button.js";

const meta = { title: "Actions/Buttons/IconButton", component: IconButton } satisfies Meta<
  typeof IconButton
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <IconButton icon="plus" label="Create item" />
      <IconButton icon="settings-2" label="Open settings" variant="secondary" />
      <IconButton icon="refresh-cw" label="Refresh list" variant="outline" />
      <IconButton icon="trash-2" label="Delete item" variant="ghost" />
    </div>
  )
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton icon="search" label="Search" size="sm" variant="outline" />
      <IconButton icon="search" label="Search" size="md" variant="outline" />
      <IconButton icon="search" label="Search" size="lg" variant="outline" />
      <IconButton icon="loader-circle" label="Loading" isLoading />
    </div>
  )
};
