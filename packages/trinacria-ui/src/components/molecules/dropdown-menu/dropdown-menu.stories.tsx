import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "./dropdown-menu.js";

const meta = {
  title: "Navigation/DropdownMenu",
  component: DropdownMenu
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: <Button variant="secondary">Open menu</Button>
  },
  render: (args) => (
    <div className="flex min-h-65 items-start justify-end">
      <DropdownMenu {...args}>
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuItem
          icon="user-round"
          title="Profile"
          description="Gestisci i dati del tuo account."
        />
        <DropdownMenuItem
          icon="settings-2"
          title="Settings"
          description="Preferenze del backoffice."
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem icon="log-out" title="Logout" tone="danger" />
      </DropdownMenu>
    </div>
  )
};
