import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./checkbox.js";

const meta = { title: "Forms/Selection/Checkbox", component: Checkbox } satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="grid max-w-xl gap-4">
      <Checkbox label="Enable plugin" description="Rende il plugin disponibile nel runtime attivo." defaultChecked />
      <Checkbox label="Require two-factor authentication" description="Imposta il requisito per tutti gli utenti admin." />
      <Checkbox label="Dangerous action confirmed" error="Devi confermare esplicitamente questa operazione." />
    </div>
  )
};
