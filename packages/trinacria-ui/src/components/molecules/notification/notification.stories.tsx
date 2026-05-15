import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { Notification, NotificationStack } from "./notification.js";

const meta = {
  title: "Display/Status/Notification",
  component: Notification
} satisfies Meta<typeof Notification>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <NotificationStack className="max-w-2xl">
      <Notification
        tone="info"
        title="Deploy completato"
        description="La nuova build del backoffice e stata pubblicata nel cluster staging."
        meta="Adesso"
        action={<Button variant="secondary">Apri changelog</Button>}
      />
      <Notification
        tone="success"
        title="Import terminato"
        description="328 record sincronizzati senza conflitti."
        meta="2 min fa"
      />
      <Notification
        tone="warning"
        title="Token in scadenza"
        description="La chiave API del provider media scade entro 24 ore."
        meta="Priorita alta"
        action={<Button variant="outline">Rigenera token</Button>}
      />
      <Notification
        tone="danger"
        title="Webhook non raggiungibile"
        description="Ultimi 5 tentativi falliti verso l'endpoint di produzione."
        meta="Errore"
        onDismiss={() => undefined}
      />
    </NotificationStack>
  )
};
