import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconTile } from "./icon-tile.js";

const meta = { title: "Data Display/IconTile", component: IconTile } satisfies Meta<
  typeof IconTile
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { icon: "folder", tone: "warning" } };
export const Tones: Story = {
  render: () => (
    <div className="flex gap-3">
      {(["neutral", "accent", "info", "success", "warning", "danger"] as const).map((tone) => (
        <IconTile key={tone} icon="image" tone={tone} label={tone} />
      ))}
    </div>
  )
};
