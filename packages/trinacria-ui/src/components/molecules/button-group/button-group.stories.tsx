import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { IconButton } from "../../atoms/icon-button/icon-button.js";
import { ButtonGroup } from "./button-group.js";

const meta = { title: "Actions/Buttons/ButtonGroup", component: ButtonGroup } satisfies Meta<
  typeof ButtonGroup
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="secondary">Cancel</Button>
      <Button variant="outline">Save draft</Button>
      <Button>Publish</Button>
    </ButtonGroup>
  )
};

export const Toolbar: Story = {
  render: () => (
    <ButtonGroup wrap={false}>
      <IconButton icon="refresh-cw" label="Refresh" variant="outline" />
      <IconButton icon="filter" label="Filter" variant="outline" />
      <IconButton icon="columns-3" label="Columns" variant="outline" />
      <Button variant="secondary">Export</Button>
    </ButtonGroup>
  )
};

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical" className="max-w-xs">
      <Button variant="secondary">Duplicate</Button>
      <Button variant="outline">Archive</Button>
      <Button variant="ghost">Delete</Button>
    </ButtonGroup>
  )
};
