import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../icon/icon.js";
import { Button } from "./button.js";

const meta = { title: "Actions/Buttons/Button", component: Button } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  )
};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button isLoading>Processing</Button>
      <Button disabled variant="secondary">
        Disabled
      </Button>
      <Button size="sm" variant="outline">
        Small
      </Button>
      <Button size="lg">Large</Button>
    </div>
  )
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>
        <Icon name="plus" />
        New item
      </Button>
      <Button variant="secondary">
        <Icon name="download" />
        Export
      </Button>
      <Button variant="outline">
        Open details
        <Icon name="arrow-right" />
      </Button>
      <Button variant="ghost">
        <Icon name="refresh-cw" />
        Refresh
      </Button>
    </div>
  )
};
