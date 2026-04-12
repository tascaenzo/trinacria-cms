import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Foundations/Theme"
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const tokenGroups = [
  {
    title: "Surfaces",
    items: ["--color-canvas", "--color-surface", "--color-panel", "--color-panel-soft", "--color-panel-strong"]
  },
  {
    title: "Ink",
    items: ["--color-ink", "--color-ink-soft", "--color-ink-muted", "--color-ink-subtle", "--color-ink-inverse"]
  },
  {
    title: "Semantic",
    items: ["--color-info-bg", "--color-success-bg", "--color-warning-bg", "--color-danger-bg"]
  }
];

export const Overview: Story = {
  render: () => (
    <div className="grid gap-8">
      {tokenGroups.map((group) => (
        <section key={group.title} className="grid gap-3">
          <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">{group.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {group.items.map((token) => (
              <div key={token} className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4">
                <div
                  className="h-16 rounded-xl border border-[color:var(--color-border)]"
                  style={{ backgroundColor: `var(${token})` }}
                />
                <p className="mt-3 text-sm font-medium text-[color:var(--color-ink)]">{token}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
};
