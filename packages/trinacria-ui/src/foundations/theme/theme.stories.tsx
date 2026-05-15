import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Foundations/Theme"
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const tokenGroups = [
  {
    title: "Surfaces",
    items: [
      "--color-canvas",
      "--color-surface",
      "--color-panel",
      "--color-panel-soft",
      "--color-panel-strong"
    ]
  },
  {
    title: "Ink",
    items: [
      "--color-ink",
      "--color-ink-soft",
      "--color-ink-muted",
      "--color-ink-subtle",
      "--color-ink-inverse"
    ]
  },
  {
    title: "Semantic",
    items: ["--color-info-bg", "--color-success-bg", "--color-warning-bg", "--color-danger-bg"]
  },
  {
    title: "Radii",
    items: ["--radius-control", "--radius-panel", "--radius-overlay", "--radius-pill"]
  },
  {
    title: "Shadows",
    items: ["--shadow-surface", "--shadow-overlay"]
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
              <div
                key={token}
                className="rounded-[var(--radius-panel)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
              >
                {token.startsWith("--color-") ? (
                  <div
                    className="h-16 rounded-[var(--radius-control)] border border-[color:var(--color-border)]"
                    style={{ backgroundColor: `var(${token})` }}
                  />
                ) : token.startsWith("--radius-") ? (
                  <div className="flex h-16 items-center gap-3">
                    <div
                      className="h-12 w-16 border border-[color:var(--color-border)] bg-[color:var(--color-panel-soft)]"
                      style={{ borderRadius: `var(${token})` }}
                    />
                    <code className="text-xs text-[color:var(--color-ink-muted)]">
                      var({token})
                    </code>
                  </div>
                ) : (
                  <div
                    className="h-16 rounded-[var(--radius-control)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
                    style={{ boxShadow: `var(${token})` }}
                  />
                )}
                <p className="mt-3 text-sm font-medium text-[color:var(--color-ink)]">{token}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
};
