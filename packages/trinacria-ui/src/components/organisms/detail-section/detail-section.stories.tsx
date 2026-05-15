import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { DetailSection } from "./detail-section.js";

const meta = { title: "Layout/Sections/DetailSection", component: DetailSection } satisfies Meta<
  typeof DetailSection
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DetailSection
      eyebrow="Settings"
      title="Resolved configuration"
      description="Dettaglio esteso del valore risolto e della provenienza."
      actions={<Button variant="secondary">Refresh</Button>}
    >
      <div className="text-sm text-[color:var(--color-ink-muted)]">
        Contenuto della sezione di dettaglio.
      </div>
    </DetailSection>
  )
};
