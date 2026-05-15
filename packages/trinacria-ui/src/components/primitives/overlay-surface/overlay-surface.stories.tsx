import type { Meta, StoryObj } from "@storybook/react-vite";
import { OverlaySurface } from "./overlay-surface.js";

const meta = {
  title: "Primitives/OverlaySurface",
  component: OverlaySurface
} satisfies Meta<typeof OverlaySurface>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4 md:grid-cols-3">
      <OverlaySurface className="p-4">
        <p className="text-sm font-medium text-[color:var(--color-ink)]">Popover</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
          Picker, menu e listbox usano questa superficie.
        </p>
      </OverlaySurface>
      <OverlaySurface variant="modal" className="p-4">
        <p className="text-sm font-medium text-[color:var(--color-ink)]">Modal</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
          Dialog centrati e flussi di conferma.
        </p>
      </OverlaySurface>
      <OverlaySurface variant="drawer" className="p-4">
        <p className="text-sm font-medium text-[color:var(--color-ink)]">Drawer</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-ink-muted)]">
          Pannelli laterali persistenti.
        </p>
      </OverlaySurface>
    </div>
  )
};
