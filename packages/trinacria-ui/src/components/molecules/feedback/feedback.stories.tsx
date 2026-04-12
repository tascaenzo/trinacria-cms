import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { EmptyState, ErrorBanner, FeedbackBanner } from "./feedback.js";

const meta = { title: "Display/Status/Feedback", component: FeedbackBanner } satisfies Meta<typeof FeedbackBanner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="max-w-2xl space-y-4">
      <FeedbackBanner tone="info" title="Runtime sync" message="Il runtime sta riallineando il catalogo plugin." />
      <ErrorBanner message="Operazione non riuscita: il plugin non ha confermato il restart." />
      <EmptyState
        title="Nessun record disponibile"
        text="Il filtro attuale non restituisce risultati."
        action={<Button variant="secondary">Reset filtri</Button>}
      />
    </div>
  )
};
