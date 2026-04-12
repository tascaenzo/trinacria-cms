import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./select.js";

const meta = { title: "Forms/Inputs/Select", component: Select } satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="max-w-xl grid gap-4">
      <Select label="Ambiente"><option>Production</option><option>Staging</option></Select>
      <Select label="Policy" error="Seleziona almeno una policy."><option value="">Seleziona</option></Select>
    </div>
  )
};
