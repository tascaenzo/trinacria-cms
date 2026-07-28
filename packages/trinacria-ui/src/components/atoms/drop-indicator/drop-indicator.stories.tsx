import type { Meta, StoryObj } from "@storybook/react-vite";
import { DropIndicator } from "./drop-indicator.js";

const meta = {
  title: "Feedback/DropIndicator",
  component: DropIndicator
} satisfies Meta<typeof DropIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-96 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-panel)] p-5">
      <p className="text-sm text-[color:var(--color-ink-muted)]">Blocco precedente</p>
      <div className="my-5">
        <DropIndicator />
      </div>
      <p className="text-sm text-[color:var(--color-ink-muted)]">Blocco successivo</p>
    </div>
  )
};
