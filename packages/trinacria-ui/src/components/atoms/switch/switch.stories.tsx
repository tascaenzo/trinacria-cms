import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./switch.js";

const meta = { title: "Forms/Selection/Switch", component: Switch } satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-4">
      <Switch
        label="Public API access"
        description="Permette l'accesso ai consumer esterni con chiavi applicative."
        defaultChecked
      />
      <Switch
        label="Maintenance mode"
        description="Blocca il frontoffice ma mantiene accessibile il backoffice."
      />
      <Switch
        label="Soft delete"
        description="Conserva i record eliminati per audit e ripristino."
        error="Questa opzione richiede un piano storage compatibile."
      />
    </div>
  )
};
