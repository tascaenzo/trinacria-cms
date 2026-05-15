import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../../atoms/badge/badge.js";
import { StatCard } from "./stat-card.js";

const meta = {
  title: "Data Display/StatCard",
  component: StatCard
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Installed plugins"
        value="24"
        description="Plugin registrati e disponibili nel runtime."
        tone="neutral"
        badge={<Badge tone="accent">Stable</Badge>}
      />
      <StatCard
        label="Runtime health"
        value="OK"
        description="Ultimo controllo operativo completato senza errori."
        tone="success"
        icon="shield-check"
      />
      <StatCard
        label="Pending alerts"
        value="3"
        description="Webhook, token o job che richiedono attenzione."
        tone="warning"
        icon="triangle-alert"
        meta="today"
      />
      <StatCard
        label="Failed jobs"
        value="1"
        description="Sincronizzazione contenuti interrotta in produzione."
        tone="danger"
        icon="x-circle"
      />
    </div>
  )
};
