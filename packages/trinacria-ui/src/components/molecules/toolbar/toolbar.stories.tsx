import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toolbar, ToolbarButton, ToolbarSelect } from "./toolbar.js";

const meta = { title: "Actions/Toolbar", component: Toolbar } satisfies Meta<typeof Toolbar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Editor: Story = {
  args: {
    label: "Azioni documento",
    children: (
      <>
        <ToolbarSelect label="Livello titolo" defaultValue="2">
          <option value="2">Titolo 2</option>
          <option value="3">Titolo 3</option>
        </ToolbarSelect>
        <ToolbarButton label="Grassetto" aria-pressed>
          B
        </ToolbarButton>
        <ToolbarButton label="Duplica" icon="copy" />
        <ToolbarButton label="Elimina" icon="trash-2" disabled />
      </>
    )
  }
};
