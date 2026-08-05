import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { ToastProvider, useToast } from "./toast.js";

const meta = {
  title: "Feedback/Toast",
  component: ToastProvider
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function ToastDemo() {
  const { pushToast, dismissAll } = useToast();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() =>
          pushToast({
            tone: "info",
            title: "Aggiornamento disponibile",
            description: "È disponibile una nuova versione del plugin."
          })
        }
      >
        Info toast
      </Button>
      <Button
        onClick={() =>
          pushToast({
            tone: "success",
            title: "Deploy completato",
            description: "La build staging e stata pubblicata correttamente."
          })
        }
      >
        Success toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          pushToast({
            tone: "warning",
            title: "Token in scadenza",
            description: "La chiave media CDN scade entro 24 ore.",
            duration: 0
          })
        }
      >
        Persistent toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          pushToast({
            tone: "danger",
            title: "Salvataggio non riuscito",
            description: "Controlla la connessione e riprova.",
            duration: 0
          })
        }
      >
        Error toast
      </Button>
      <Button variant="ghost" onClick={dismissAll}>
        Clear all
      </Button>
    </div>
  );
}

export const Playground: Story = {
  render: () => (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  )
};
