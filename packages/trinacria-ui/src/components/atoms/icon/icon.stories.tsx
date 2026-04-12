import type { Meta, StoryObj } from "@storybook/react-vite";
import { ICON_NAMES, Icon } from "./icon.js";

const sections = [
  {
    title: "Navigation",
    icons: ["layout-dashboard", "panel-left", "panel-left-close", "columns-3", "arrow-right", "external-link"],
  },
  {
    title: "Content",
    icons: ["folder-open", "folder-cog", "file-text", "file-json", "image", "package"],
  },
  {
    title: "System",
    icons: ["plug", "puzzle", "database", "server", "hard-drive", "settings-2"],
  },
  {
    title: "Users & Security",
    icons: ["users", "user-round", "shield", "shield-check", "lock-keyhole", "key-round"],
  },
  {
    title: "Actions",
    icons: ["plus", "pencil", "save", "refresh-cw", "download", "upload", "trash-2", "more-horizontal"],
  },
  {
    title: "Status",
    icons: ["check", "check-check", "circle-check-big", "circle-alert", "triangle-alert", "x", "x-circle", "loader-circle"],
  },
  {
    title: "Utility",
    icons: ["search", "eye", "eye-off", "calendar-days", "clock-3", "bell", "mail", "globe", "sparkles"],
  },
] as const;

const meta = { title: "Foundations/Iconography/Icon", component: Icon } satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Registry: Story = {
  render: () => (
    <div className="grid gap-6">
      {sections.map((section) => (
        <section key={section.title} className="grid gap-3">
          <header className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
              {section.title}
            </h3>
            <span className="text-xs text-[color:var(--color-ink-subtle)]">{section.icons.length} icons</span>
          </header>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {section.icons.map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
              >
                <Icon name={name} className="h-5 w-5" />
                <span className="text-sm text-[color:var(--color-ink-muted)]">{name}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};

export const FullIndex: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {ICON_NAMES.map((name) => (
        <div
          key={name}
          className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
        >
          <Icon name={name} className="h-5 w-5" />
          <span className="text-sm text-[color:var(--color-ink-muted)]">{name}</span>
        </div>
      ))}
    </div>
  ),
};
