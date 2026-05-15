import type { Meta, StoryObj } from "@storybook/react-vite";
import { NumberInput } from "./number-input.js";

const meta = { title: "Forms/Inputs/NumberInput", component: NumberInput } satisfies Meta<
  typeof NumberInput
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="grid max-w-xl gap-4">
      <NumberInput
        label="Sort order"
        hint="Usato per ordinare i record in tabella."
        defaultValue={10}
        min={0}
      />
      <NumberInput label="Price" prefix="EUR" step="0.01" placeholder="99.90" />
      <NumberInput label="Storage quota" suffix="GB" defaultValue={250} />
      <NumberInput
        label="Max retry"
        error="Il valore deve essere compreso tra 1 e 5."
        defaultValue={8}
      />
    </div>
  )
};
