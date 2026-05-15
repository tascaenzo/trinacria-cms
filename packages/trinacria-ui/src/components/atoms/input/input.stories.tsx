import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input.js";

const meta = { title: "Forms/Inputs/Input", component: Input } satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="max-w-xl grid gap-4">
      <Input
        label="Site name"
        hint="Nome visualizzato nel backoffice."
        placeholder="Trinacria CMS"
      />
      <Input label="Client ID" error="Il campo e obbligatorio." placeholder="oauth-client-id" />
      <Input label="Readonly" defaultValue="tenant-prod" disabled />
    </div>
  )
};
