import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./textarea.js";

const meta = { title: "Forms/Inputs/Textarea", component: Textarea } satisfies Meta<
  typeof Textarea
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="max-w-xl grid gap-4">
      <Textarea
        label="Descrizione"
        hint="Contesto breve per operatori."
        placeholder="Istanza editoriale principale"
      />
      <Textarea label="JSON schema" error="Schema non valido." placeholder='{"type":"object"}' />
    </div>
  )
};
