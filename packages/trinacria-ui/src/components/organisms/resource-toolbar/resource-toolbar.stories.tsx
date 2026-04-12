import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { Input } from "../../atoms/input/input.js";
import { ResourceToolbar } from "./resource-toolbar.js";

const meta = { title: "Layout/Toolbars/ResourceToolbar", component: ResourceToolbar } satisfies Meta<typeof ResourceToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ResourceToolbar
      leading={<p className="text-sm text-[color:var(--color-ink-muted)]">24 utenti trovati</p>}
      filters={<Input placeholder="Cerca per email o nome" />}
      actions={
        <>
          <Button variant="secondary">Aggiorna</Button>
          <Button>Nuovo utente</Button>
        </>
      }
    />
  )
};
