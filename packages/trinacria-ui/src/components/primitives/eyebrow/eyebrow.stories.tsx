import type { Meta, StoryObj } from "@storybook/react-vite";
import { Eyebrow } from "./eyebrow.js";

const meta = { title: "Primitives/Typography/Eyebrow", component: Eyebrow } satisfies Meta<
  typeof Eyebrow
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Kernel runtime"
  }
};
