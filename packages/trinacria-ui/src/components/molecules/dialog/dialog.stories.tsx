import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { Dialog } from "./dialog.js";

const meta = { title: "Layout/Overlay/Dialog", component: Dialog } satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Modal: Story = {
  render: () => (
    <Dialog
      open
      onClose={() => undefined}
      title="Nuova API key"
      description="Conferma i permessi e la scadenza prima di generare la chiave."
      footer={<><Button variant="secondary">Annulla</Button><Button>Genera</Button></>}
    >
      <p className="text-sm leading-6 text-[color:var(--color-ink-muted)]">Preview del dialog operativo del backoffice.</p>
    </Dialog>
  ),
  parameters: { layout: "fullscreen" }
};
