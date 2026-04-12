import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { Input } from "../../atoms/input/input.js";
import { FormSection } from "./form-section.js";

const meta = { title: "Layout/Sections/FormSection", component: FormSection } satisfies Meta<typeof FormSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FormSection
      title="Create user"
      description="Compila i campi minimi per creare un utente amministrativo."
      error="Email già presente nel tenant."
      actions={<><Button variant="ghost">Cancel</Button><Button>Create</Button></>}
    >
      <Input label="Email" type="email" />
      <Input label="Display name" />
    </FormSection>
  )
};
