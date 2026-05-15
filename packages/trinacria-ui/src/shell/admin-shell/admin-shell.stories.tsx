import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../components/atoms/button/button.js";
import { AdminShell } from "./admin-shell.js";

const navigation = [
  { id: "dashboard", routeId: "dashboard", title: "Dashboard", icon: "layout-dashboard" },
  { id: "users", routeId: "users", title: "Users", icon: "users", group: "Identity" },
  {
    id: "settings",
    routeId: "settings",
    title: "Settings",
    icon: "settings-2",
    group: "System",
    badge: "core"
  }
] as const;

const meta = { title: "Navigation/Shell/AdminShell", component: AdminShell } satisfies Meta<
  typeof AdminShell
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <AdminShell
      title="Settings"
      subtitle="Gestione configurazioni e ownership runtime."
      activeRouteId="settings"
      navigation={navigation}
      onNavigate={() => undefined}
      statusBadges={[{ label: "Runtime", value: "Healthy", tone: "success" }]}
      headerActions={<Button size="sm">Nuova impostazione</Button>}
    >
      <div className="p-8">
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-6 text-sm text-[color:var(--color-ink-muted)]">
          Area contenuti della route attiva.
        </div>
      </div>
    </AdminShell>
  ),
  parameters: { layout: "fullscreen" }
};
