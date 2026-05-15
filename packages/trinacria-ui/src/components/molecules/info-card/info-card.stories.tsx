import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { InfoCard } from "./info-card.js";

const meta = {
  title: "Display/InfoCard",
  component: InfoCard
} satisfies Meta<typeof InfoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2">
      <InfoCard
        eyebrow="Owner plugin"
        title="core-pack"
        description="Il plugin proprietario mantiene la responsabilita del setting."
      />
      <InfoCard
        title="Write handoff"
        description="Prepara endpoint, payload e headers necessari per la write firmata."
        action={<Button variant="secondary">Prepare</Button>}
        tone="dashed"
      />
    </div>
  )
};
