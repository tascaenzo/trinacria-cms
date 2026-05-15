import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormControlShell, FormControlSurface } from "./form-control.js";

const meta = {
  title: "Forms/Infrastructure/FormControl",
  component: FormControlShell
} satisfies Meta<typeof FormControlShell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <div className="grid max-w-xl gap-4">
      <FormControlShell
        label="API key label"
        hint="Nome interno visibile solo agli amministratori."
      >
        <input
          className="h-10 w-full rounded-lg border border-[color:var(--color-border-strong)] bg-white px-3 text-sm text-[color:var(--color-ink)] outline-none"
          defaultValue="Public integration"
        />
      </FormControlShell>

      <FormControlShell label="Numeric field" error="Il valore non e valido.">
        <FormControlSurface error>
          <span className="border-r border-[color:var(--color-border)] px-3 text-[color:var(--color-ink-subtle)]">
            EUR
          </span>
          <input
            className="h-full w-full bg-transparent px-3 text-sm text-[color:var(--color-ink)] outline-none"
            defaultValue="49.90"
          />
        </FormControlSurface>
      </FormControlShell>
    </div>
  )
};
