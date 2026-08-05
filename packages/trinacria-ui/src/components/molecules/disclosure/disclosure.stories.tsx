import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../../atoms/input/input.js";
import { Disclosure } from "./disclosure.js";

const meta = {
  title: "Layout/Disclosure",
  component: Disclosure
} satisfies Meta<typeof Disclosure>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    summary: "Impostazioni avanzate",
    children: <Input label="Chiave interna" defaultValue="editorial.default" />
  }
};
